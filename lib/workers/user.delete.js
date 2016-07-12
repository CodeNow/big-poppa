'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))

const logger = require('util/logger').child({ module: 'worker/user.create' })
const bookshelf = require('models').bookshelf
const Organization = require('models/organization')
const User = require('models/user')

const NotFoundError = require('errors/not-found-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const WorkerError = require('error-cat/errors/worker-error')

/**
 * Schema for user.delete jobs.
 * @type {Joi~Schema}
 */
const jobSchema = Joi.object({
  githubId: Joi.number().required()
})

/**
 * Remove user from all organizations
 *
 * @param {Number}         orgId     - Organization Id
 * @param {Object}  user - User model instance
 * @param {Object}         opts    - Bookshelf options object
 * @return {Promise}
 */
const removeUserFromOrgs = (user, userOrgIds, opts) => {
  const log = logger.child({
    method: 'DeleteOrganization.removeUserFromOrgs',
    userOrgIds: userOrgIds,
    opts: opts
  })
  log.trace({ userOrgIds: userOrgIds }, 'Orgs users belongs to')
  return Promise.map(userOrgIds, (orgId) => {
    return Organization.fetchById(orgId, opts)
      .then(org => org.removeUser(user, opts))
  })
    .catch(err => {
      // If we fail to remove a user from an organization, retry the job
      throw new WorkerError(
        `Error removing a user from an org: ${err.toString()}`,
        { err: err }
      )
    })
}

/**
 * Deletes an existing User
 *
 * @param {Object}    job          - job passed by RabbitMQ
 * @param {Number}    job.githubId - Github ID for User
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
            return user.getAllIdsForRelated('organizations', opts)
              .then(userOrgIds => removeUserFromOrgs(user, userOrgIds, opts))
          })
          .then(user => user.destroy({ transacting: t }))
      })
    })
    .catch(NotFoundError, err => {
      throw new WorkerStopError(
        `User was not deleted. This user does not seem to exist: ${err.toString()}`,
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
