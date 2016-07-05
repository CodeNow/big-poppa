'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))

const logger = require('../logger').child({ module: 'worker/user.create' })
const User = require('common/models/user')

const GithubEntityError = require('common/errors/github-entity-error')
const UniqueError = require('common/errors/unique-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

/**
 * Schema for user.create jobs.
 * @type {Joi~Schema}
 */
const jobSchema = Joi.object({
  githubId: Joi.number().required()
})

/**
 * Creates new User
 *
 * @param {Object}    job          - job passed by RabbitMQ
 * @param {Number}    job.githubId - Github ID for new User
 * @return {Promise}
 */
module.exports = function CreateUser (job) {
  const log = logger.child({ job: job, method: 'CreateUser' })
  return Joi.validateAsync(job, jobSchema)
    .then(() => {
      log.info('CreateUser called')
      return new User()
        .save({
          github_id: job.githubId
        })
    })
    .catch(GithubEntityError, err => {
      throw new WorkerStopError(
        `Error fetching user from Github: ${err.toString()}`,
        { err: err }
      )
    })
    .catch(UniqueError, err => {
      throw new WorkerStopError(
        `User with id already exists: ${err.toString()}`,
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
