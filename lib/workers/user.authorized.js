'use strict'

const Joi = require('joi')
const User = require('models/user')

const GithubEntityError = require('errors/github-entity-error')
const UniqueError = require('errors/unique-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

/**
 * Schema for user.authorized jobs.
 * @type {Joi~Schema}
 */
module.exports.jobSchema = Joi.object({
  tid: Joi.string().guid(),
  githubId: Joi.number().required(),
  accessToken: Joi.string().required()
})

/**
 * Creates or update new User. If user exists, only accesToken will be updated.
 *
 * @param {Object}    job            - job passed by RabbitMQ
 * @param {Number}    job.githubId   - Github ID for new User
 * @param {String}    job.accessToken - Github ID for new User
 * @return {Promise}
 */
module.exports = function UserAuthorized (job) {
  return User.updateOrCreateByGithubId(job.githubId, job.accessToken)
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
}
