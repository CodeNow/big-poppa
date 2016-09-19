'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))
const moment = require('moment')

const logger = require('util/logger').child({ module: 'worker/organization.create' })
const Organization = require('models/organization')
const rabbitMQ = require('util/rabbitmq')

const GithubEntityError = require('errors/github-entity-error')
const UniqueError = require('errors/unique-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

/**
 * Schema for organization.create jobs.
 * @type {Joi~Schema}
 */
const jobSchema = Joi.object({
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
 * @param {Object} rawJob                        - job passed by RabbitMQ
 * @param {Number} rawJob.githubId               - Github ID for new Organization
 * @param {Object} rawJob.creator                - Object with creator user details
 * @param {Number} rawJob.creator.githubId       - Creator's githubId
 * @param {String} rawJob.creator.githubUsername - Creator's github login
 *
 * @resolves {Organization}    the newly created organization
 * @throws   {WorkerStopError} on Joi violation
 * @throws   {WorkerStopError} when the github query fails
 */
module.exports = function CreateOrganization (rawJob) {
  const log = logger.child({ job: rawJob, method: 'CreateOrganization' })
  return Joi.validateAsync(rawJob, jobSchema, { stripUnknown: true })
    .then(job => {
      log.info('CreateOrganization called')
      return Organization.create(job.githubId)
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
        .tap((org) => {
          log.trace('Create user org relationship')
          return rabbitMQ.publishOrganizationUserAdd({
            tid: job.tid,
            organizationGithubId: job.githubId,
            userGithubId: job.creator.githubId
          })
        })
        .tap(function enqueueASGCreateJob (org) {
          const githubId = org.get('githubId')
          log.trace({ githubId: githubId }, 'Publish ASG Create')
          return rabbitMQ.publishASGCreate({
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
          return rabbitMQ.publishOrganizationCreated({
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
    })
    .catch(err => {
      if (err.isJoi) {
        throw new WorkerStopError(
          `Invalid Job: ${err.toString()}`,
          { err: err }
        )
      }
      throw err
    })
}
