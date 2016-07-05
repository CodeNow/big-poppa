'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))

const logger = require('../logger').child({ module: 'worker/organization.user.add' })
const Organization = require('common/models/organization')
const User = require('common/models/user')

const NotFoundError = require('common/errors/not-found-error')
const NoRowsDeletedError = require('common/errors/no-rows-deleted-error')
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
module.exports = function RemoveUserFromOrganization (rawJob) {
  const log = logger.child({ job: rawJob, method: 'RemoveUserFromOrganization' })
  return Joi.validateAsync(rawJob, jobSchema)
    .then((job) => {
      log.info('RemoveUserFromOrganization called')
      return Promise.all([
        Organization.fetchByGithubId(job.organizationGithubId),
        User.fetchByGithubId(job.userGithubId)
      ])
        .spread((org, user) => {
          return org.removeUser(user)
        })
    })
    .catch(NotFoundError, err => {
      throw new WorkerStopError(
        `Organization or user was not found. This organization/user does not seem to exist: ${err.toString()}`,
        { err: err }
      )
    })
    .catch(NoRowsDeletedError, err => {
      throw new WorkerStopError(
        `No users were removed from organization: ${err.toString()}`,
        { err: err }
      )
    })
    .catch((err) => {
      if (err.isJoi) {
        throw new WorkerStopError(
          `Invalid Job: ${err.toString()}`,
          { err: err }
        )
      }
      throw err
    })
}
