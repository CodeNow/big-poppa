'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))

const logger = require('util/logger').child({ module: 'worker/organization.create' })
const bookshelf = require('models').bookshelf
const Organization = require('models/organization')
const User = require('models/user')

const NotFoundError = require('errors/not-found-error')
const WorkerError = require('error-cat/errors/worker-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

/**
 * Schema for organization.delete jobs.
 * @type {Joi~Schema}
 */
const jobSchema = Joi.object({
  githubId: Joi.number().required()
})

/**
 * Remove all users from an organization
 *
 * @param {Object}         org     - Organization model instance
 * @param {Array<Number>}  userIds - Ids of all users to be deleted
 * @param {Object}         opts    - Bookshelf options object
 * @return {Promise}
 */
const removeAllUsers = (org, userIds, opts) => {
  const log = logger.child({
    method: 'DeleteOrganization.removeAllUsers',
    userIds: userIds,
    opts: opts
  })
  log.trace({ userIds: userIds }, 'Users that belong to org')
  return Promise.map(userIds, (userId) => {
    return User.fetchById(userId, opts)
      .then(user => org.removeUser(user, opts))
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
 * Deletes an organization from the database.
 *
 * @param {Object}    job          - job passed by RabbitMQ
 * @param {Number}    job.githubId - Github ID for Organization to be deleted
 * @return {Promise}
 */
module.exports = function DeleteOrganization (job) {
  const log = logger.child({ job: job, method: 'DeleteOrganization' })
  return Joi.validateAsync(job, jobSchema)
    .then(() => {
      log.info('DeleteOrganization called')
      return bookshelf.transaction(t => {
        let opts = { transacting: t }
        return Organization.fetchByGithubId(job.githubId, opts)
          .tap(org => {
            return org.getAllIdsForRelated('users', opts)
              .then(userIds => removeAllUsers(org, userIds, opts))
          })
          .then(org => org.destroy({ transacting: t }))
      })
    })
    .catch(NotFoundError, err => {
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