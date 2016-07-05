'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))

const logger = require('../logger').child({ module: 'worker/organization.user.add' })
const Organization = require('../../common/models/organization')
const User = require('../../common/models/user')

const NotFoundError = require('../../common/errors/not-found-error')
const UniqueError = require('../../common/errors/unique-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

/**
 * Schema for organization.user.add jobs.
 * @type {Joi~Schema}
 */
const jobSchema = Joi.object({
  organizationGithubId: Joi.number().required(),
  userGithubId: Joi.number().required()
})

/**
 *
 * @param {object}
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
