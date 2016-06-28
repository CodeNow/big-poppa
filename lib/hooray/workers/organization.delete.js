'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const NoRowsDeletedError = require('../../common/errors/no-rows-deleted-error')

const logger = require('../logger').child({ module: 'worker/organization.create' })
const Organization = require('../../common/models/organization')
const User = require('../../common/models/user')

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
    .catch(NoRowsDeletedError, err => {
      throw new WorkerStopError(
        `No users deleted because no users were found: ${err.toString()}`,
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
