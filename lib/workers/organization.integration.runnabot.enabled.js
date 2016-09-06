'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))

const logger = require('util/logger').child({ module: 'worker/organization.integration.runnabot.enabled' })
const Organization = require('models/organization')

const NotFoundError = require('errors/not-found-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

/**
 * Schema for organization.integration.runnabot.enabled jobs.
 * @type {Joi~Schema}
 */
module.exports.jobSchema = Joi.object({
  organizationId: Joi.number().required()
})

/**
 * Sets the runnabotEnabled flag on the Organization to true
 *
 * @param {Object}   job                - job passed by RabbitMQ
 * @param {Number}   job.organizationId - Big Poppa ID for Organization to be updated
 * @return {Promise}
 */
module.exports.task = function RunnabotEnabled (job) {
  const log = logger.child({ job: job, method: 'RunnabotEnabled' })
  log.info('DeleteOrganization called')
  return Organization.fetchById(job.organizationId)
    .then(function (org) {
      if (!org.get('runnabotEnabled')) {
        return org.save({
          runnabotEnabled: true
        })
      }
      throw new WorkerStopError('Organization was not updated. RunnabotEnabled is already set')
    })
    .catch(NotFoundError, err => {
      throw new WorkerStopError(
        `Organization was not updated. This organization does not seem to exist: ${err.toString()}`,
        { err: err }
      )
    })
}
