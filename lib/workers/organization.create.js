'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))

const logger = require('util/logger').child({ module: 'worker/organization.create' })
const Organization = require('models/organization')

const GithubEntityError = require('errors/github-entity-error')
const UniqueError = require('errors/unique-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

/**
 * Schema for organization.create jobs.
 * @type {Joi~Schema}
 */
const jobSchema = Joi.object({
  githubId: Joi.number().required()
})

/**
 * Creates new Organization.
 *
 * @param {Object}    job          - job passed by RabbitMQ
 * @param {Number}    job.githubId - Github ID for new Organization
 * @return {Promise}
 */
module.exports = function CreateOrganization (job) {
  const log = logger.child({ job: job, method: 'CreateOrganization' })
  return Joi.validateAsync(job, jobSchema)
    .then(() => {
      log.info('CreateOrganization called')
      return Organization.create(job.githubId)
    })
    .catch(GithubEntityError, err => {
      throw new WorkerStopError(
        `Error fetching organization from Github: ${err.toString()}`,
        { err: err }
      )
    })
    .catch(UniqueError, err => {
      throw new WorkerStopError(
        `Organization with id already exists: ${err.toString()}`,
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
