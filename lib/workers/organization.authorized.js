'use strict'

const Joi = require('joi')
const moment = require('moment')

const logger = require('util/logger').child({ module: 'worker/organization.authorized' })
const Organization = require('models/organization')
const User = require('models/user')
const rabbitMQ = require('util/rabbitmq')

const GithubEntityError = require('errors/github-entity-error')
const UniqueError = require('errors/unique-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const WorkerError = require('error-cat/errors/worker-error')
const NotFoundError = require('errors/not-found-error')

module.exports.maxNumRetries = 11

module.exports.retryDelay = 500

/**
 * Schema for organization.authorized jobs.
 * @type {Joi~Schema}
 */
module.exports.jobSchema = Joi.object({
  tid: Joi.string().guid(),
  githubId: Joi.number().required(),
  creator: Joi.object({
    githubId: Joi.number().required(),
    githubUsername: Joi.string().required()
  }).unknown().required()
})

/**
 * Creates new Organization.
 *
 * @param {Object} job                        - job passed by RabbitMQ
 * @param {Number} job.githubId               - Github ID for new Organization
 * @param {Object} job.creator                - Object with creator user details
 * @param {Number} job.creator.githubId       - Creator's githubId
 * @param {String} job.creator.githubUsername - Creator's github login
 *
 * @resolves {Organization}    the newly created organization
 * @throws   {WorkerStopError} on Joi violation
 * @throws   {WorkerStopError} when the github query fails
 */
module.exports = function OrganizationAuthorized (job) {
  const log = logger.child({ job: job, method: 'OrganizationAuthorized' })
  return User.fetchByGithubId(job.creator.githubId)
    .catch(NotFoundError, (err) => {
      // User might have not been created yet. Retry until user gets created
      throw new WorkerError(
        `Organization creator user does not exist: ${err.toString()}`,
        { err }
      )
    })
    .then(function createOrganizationWithCreator (user) {
      return Organization.create(job.githubId, user)
      .catch(UniqueError, err => {
        // Necessary to make worker idempotent
        // Since something else might have failed, we can allow
        log.trace(
          { err: err },
          `Organization with id already exists: ${err.toString()}`
        )
        return Organization.fetchByGithubId(job.githubId)
      })
      .catch(GithubEntityError, err => {
        throw new WorkerStopError(
          `Error fetching organization from Github: ${err.toString()}`,
          { err: err }
        )
      })
    })
    .tap((org) => {
      log.trace('Create user org relationship')
      return rabbitMQ.publishTask('organization.user.add', {
        tid: job.tid,
        organizationGithubId: job.githubId,
        userGithubId: job.creator.githubId
      })
    })
    .tap(function enqueueASGCreateJob (org) {
      const githubId = org.get('githubId')
      log.trace({ githubId: githubId }, 'Publish ASG Create')
      return rabbitMQ.publishTask('asg.create', {
        githubId: githubId
      })
    })
    .tap(function publishOrganizationCretedEvent (org) {
      const orgName = org.get('name')
      const githubId = org.get('githubId')
      log.trace({
        githubId: githubId,
        orgName: orgName
      }, 'Publish Organization Crated')
      return rabbitMQ.publishEvent('organization.created', {
        organization: {
          id: org.get('id'),
          githubId: githubId,
          name: orgName
        },
        creator: {
          githubId: job.creator.githubId,
          githubUsername: job.creator.githubUsername
        },
        createdAt: moment(org.createdAt).toISOString()
      })
    })
}
