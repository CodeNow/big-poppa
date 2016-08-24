'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))

const logger = require('util/logger').child({ module: 'worker/user.create-or-update' })
const User = require('models/user')

const NotFoundError = require('errors/not-found-error')
const GithubEntityError = require('errors/github-entity-error')
const UniqueError = require('errors/unique-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

/**
 * Schema for user.create-or-update jobs.
 * @type {Joi~Schema}
 */
const jobSchema = Joi.object({
  tid: Joi.string().guid(),
  githubId: Joi.number().required(),
  accessToken: Joi.string().required()
})

/**
 * Creates or update new User. If user exists, only accesToken will be updated.
 *
 * @param {Object}    job            - job passed by RabbitMQ
 * @param {Number}    job.githubId   - Github ID for new User
 * @param {Number}    job.accesToken - Github ID for new User
 * @return {Promise}
 */
module.exports = function CreateOrUpdateUser (job) {
  const log = logger.child({ job: job, method: 'CreateOrUpdateUser' })
  return Joi.validateAsync(job, jobSchema)
    .then(() => {
      log.info('CreateOrUpdateUser called')
      return User.fetchByGithubId(job.githubId)
        .then(function updateUserAccessToken (user) {
          log.trace('Updating user with new access token')
          return user.save({
            accessToken: job.accessToken
          })
        })
        .catch(NotFoundError, function createUser () {
          log.trace('Creating/saving new user')
          return new User()
            .save({
              githubId: job.githubId,
              accessToken: job.accessToken
            })
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
