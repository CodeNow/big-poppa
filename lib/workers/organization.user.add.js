'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))

const logger = require('util/logger').child({ module: 'worker/organization.user.add' })
const Organization = require('models/organization')
const User = require('models/user')

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
 * @param {Object}    job                      - job passed by RabbitMQ
 * @param {Number}    job.organizationGithubId - Github ID for existing organization
 * @param {Number}    job.userGithubId         - Github ID for exiting user
 * @return {Promise}
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
