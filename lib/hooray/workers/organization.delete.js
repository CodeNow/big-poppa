'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))

const logger = require('../logger').child({ module: 'worker/organization.create' })
const Organization = require('common/models/organization')
const User = require('common/models/user')

const NoRowsDeletedError = require('common/errors/no-rows-deleted-error')
const NotFoundError = require('common/errors/not-found-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

/**
 * Schema for organization.delete jobs.
 * @type {Joi~Schema}
 */
const jobSchema = Joi.object({
  githubId: Joi.number().required()
})

/**
 *
 * @param {object}
 * @return {Promise}
 */
module.exports = function DeleteOrganization (job) {
  const log = logger.child({ job: job, method: 'DeleteOrganization' })
  return Joi.validateAsync(job, jobSchema)
    .then(() => {
      log.info('DeleteOrganization called')
      return Organization.fetchByGithubId(job.githubId)
        .tap(org => {
          if (!org) throw new WorkerStopError('No organization with ID found', { githubId: job.githubId })
          return org.getAllUserIds()
            .then(userIds => {
              log.trace({ userIds: userIds }, 'Users that belong to org')
              return Promise.map(userIds, userId => {
                return User.fetchById(userId)
                  .then(user => org.removeUser(user))
              })
            })
        })
        .then(org => org.destroy({ require: true }))
    })
    .catch(NotFoundError, NoRowsDeletedError, err => {
      throw new WorkerStopError(
        `Organization was not deleted. This organization does not seem to exist: ${err.toString()}`,
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
