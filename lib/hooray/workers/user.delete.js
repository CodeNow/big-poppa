'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))

const logger = require('../logger').child({ module: 'worker/user.create' })
const bookshelf = require('common/models').bookshelf
const Organization = require('../../common/models/organization')
const User = require('../../common/models/user')

const WorkerStopError = require('error-cat/errors/worker-stop-error')
const NoRowsDeletedError = require('../../common/errors/no-rows-deleted-error')
const NotFoundError = require('../../common/errors/not-found-error')

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
      return bookshelf.transaction(t => {
        let opts = { transacting: t }
        return User.fetchByGithubId(job.githubId, opts)
          .tap(user => {
            if (!user) throw WorkerStopError('No User Found')
            return user.getAllIdsForRelated('organizations', opts)
              .then(userOrgIds => {
                log.trace({ userOrgIds: userOrgIds }, 'Orgs user belogs to')
                // NOTE: We could either cascade deletes (since we already) have org ids
                // or we could manually delete them to make functionality more consistent
                return Promise.map(userOrgIds, orgId => {
                  return Organization.fetchById(orgId, opts)
                    .then(org => org.removeUser(user, opts))
                })
              })
          })
          .then(user => user.destroy({ require: true, transacting: t }))
      })
    })
    .catch(NotFoundError, NoRowsDeletedError, (err) => {
      throw new WorkerStopError(
        `User was not deleted. This user does not seem to exist: ${err.toString()}`,
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
