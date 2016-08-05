'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))

const logger = require('util/logger').child({ module: 'worker/organization.user.add' })
const Organization = require('models/organization')
const User = require('models/user')
const rabbitMQ = require('util/rabbitmq')

const NotFoundError = require('errors/not-found-error')
const UniqueError = require('errors/unique-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

/**
 * Schema for organization.user.add jobs.
 * @type {Joi~Schema}
 */
const jobSchema = Joi.object({
  tid: Joi.string().guid(),
  organizationGithubId: Joi.number().required(),
  userGithubId: Joi.number().required()
})

/**
 * Adds a user to an organization
 *
 * @param {Object}    rawJob                      - job passed by RabbitMQ
 * @param {Number}    rawJob.organizationGithubId - Github ID for existing organization
 * @param {Number}    rawJob.userGithubId         - Github ID for exiting user
 *
 * @resolves {User}            the user that was added, which should now feature the attached org
 * @throws   {WorkerStopError} on Joi violation
 * @throws   {WorkerStopError} when the relationship already exists
 * @throws   {WorkerStopError} when the github query fails
 */
module.exports = function AddUserToOrganization (rawJob) {
  const log = logger.child({ job: rawJob, method: 'AddUserToOrganization' })
  return Joi.validateAsync(rawJob, jobSchema)
    .then(job => {
      log.info('AddUserToOrganization called')
      return Promise.all([
        Organization.fetchByGithubId(job.organizationGithubId),
        User.fetchByGithubId(job.userGithubId)
      ])
        .spread((org, user) => {
          return org.addUser(user)
            .then(() => {
              return Promise.props({
                org: org,
                user: user
              })
            })
        })
        .tap(function publishEvent (res) {
          log.trace({
            organizationId: res.org.get(res.org.idAttribute),
            organizationGithubId: res.org.get('githubId'),
            userId: res.user.get(res.user.idAttribute),
            userGithubId: res.user.get('githubId')
          }, 'Publish User added to Organization')
          return rabbitMQ.publishUserAddedToOrganization({
            organization: {
              id: res.org.id,
              githubId: res.org.get('githubId')
            },
            user: {
              id: res.user.id,
              githubId: res.user.get('githubId')
            }
          })
        })
    })
    .catch(NotFoundError, err => {
      throw new WorkerStopError(
        `Organization or user was not found. This organization/user does not seem to exist: ${err.toString()}`,
        { err: err }
      )
    })
    .catch(UniqueError, err => {
      throw new WorkerStopError(
        `User already added to organization: ${err.toString()}`,
        { err: err }
      )
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

module.exports.schema = jobSchema
