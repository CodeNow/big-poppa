'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))

const logger = require('util/logger').child({ module: 'worker/organization.integration.prbot.disabled' })
const bookshelf = require('models').bookshelf
const Organization = require('models/organization')

const NotFoundError = require('errors/not-found-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

/**
 * Schema for organization.integration.prbot.disabled jobs.
 * @type {Joi~Schema}
 */
module.exports.jobSchema = Joi.object({
  organizationId: Joi.number().required()
}).required().label('Organization.integration.prbot.disabled')

/**
 * Sets the prBotEnabled flag on the Organization to false
 *
 * @param {Object}   job                - job passed by RabbitMQ
 * @param {Number}   job.organizationId - Big Poppa ID for Organization to be updated
 * @return {Promise}
 */
module.exports.task = function PrBotDisabled (job) {
  const log = logger.child({ job: job, method: 'PrBotDisabled' })
  log.info('PrBotDisabled called')
  return bookshelf.transaction(t => {
    let opts = { transacting: t }
    return Organization.fetchById(job.organizationId, opts)
      .then(function (org) {
        if (org.get('prBotEnabled')) {
          return org.save({
            prBotEnabled: false
          }, opts)
        }
        throw new WorkerStopError('Organization was not updated. PrBotEnabled is already false')
      })
  })
    .catch(NotFoundError, err => {
      throw new WorkerStopError(
        `Organization was not updated. This organization does not seem to exist: ${err.toString()}`,
        { err: err }
      )
    })
}
