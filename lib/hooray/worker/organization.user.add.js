'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const ForeignKeyError = require('../../common/errors/foreign-key-error')
const UniqueError = require('../../common/errors/unique-error')
const GithubEntityError = require('../../common/errors/github-entity-error')

const logger = require('../logger').child({ module: 'worker/organization.user.add' })
const Organization = require('../../common/models/organization')
const User = require('../../common/models/user')

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
        Organization.fetchById(job.organizationGithubId),
        User.fetchById(job.userGithubId)
      ])
        .spread((org, user) => {
          return org.addUser(user)
        })
    })
    .catch(GithubEntityError, err => {
      throw new WorkerStopError(
        `User does not exist in database: ${err.toString()}`,
        { err: err }
      )
    })
    .catch(UniqueError, err => {
      throw new WorkerStopError(
        `User already added to organization: ${err.toString()}`,
        { err: err }
      )
    })
    .catch(ForeignKeyError, err => {
      throw new WorkerStopError(
        `Organization with id does not exist: ${err.toString()}`,
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
