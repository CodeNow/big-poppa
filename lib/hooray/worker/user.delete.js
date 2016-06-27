'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const NoRowsDeletedError = require('../../common/errors/no-rows-deleted-error')

const logger = require('../logger').child({ module: 'worker/user.create' })
const Organization = require('../../common/models/organization')
const User = require('../../common/models/user')

/**
 * Schema for user.delete jobs.
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
module.exports = function DeleteUser (job) {
  const log = logger.child({ job: job, method: 'DeleteUser' })
  return Joi.validateAsync(job, jobSchema)
    .then(() => {
      log.info('DeleteUser called')
      return User.fetchById(job.githubId)
        .tap(user => {
          return user.getAllUserOrgsIds()
            .then(userOrgIds => {
              log.trace({ userOrgIds: userOrgIds }, 'Orgs user belogs to')
              // NOTE: We could either cascade deletes (since we already) have org ids
              // or we could manually delete them to make functionality more consistent
              return Promise.map(userOrgIds, orgId => {
                return Organization.fetchById(orgId)
                  .then(org => org.removeUser(user))
              })
            })
        })
        .then(user => user.destroy({ require: true }))
    })
    .catch(NoRowsDeletedError, (err) => {
      throw new WorkerStopError(
        `No rows deleted. This user does not seem to exist: ${err.toString()}`,
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
