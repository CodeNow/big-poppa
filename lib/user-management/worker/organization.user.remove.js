'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))
const moment = require('moment')
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const ForeignKeyError = require('../../common/errors/foreign-key-error')
const UniqueError = require('../../common/errors/unique-error')

const logger = require('../logger').child({ module: 'worker/organization.user.add' })
const Util = require('../../common/util')
const Organization = require('../../common/models').Organization
const User = require('../../common/models').User

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
      return new User({ github_id: job.userGithubId })
        .fetch()
        .then(user => {
          if (!user) {
            throw new WorkerStopError('User does not exist')
          }
          // TODO: Should throw an error if it doesn't exist
          return Organization.forge({ github_id: job.organizationGithubId  })
            .users()
            .detach(job.userGithubId)
        })
        .catch(Util.castDatabaseError)
        .tap((model) => {
          log.trace('User removed from organization')
        })
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
