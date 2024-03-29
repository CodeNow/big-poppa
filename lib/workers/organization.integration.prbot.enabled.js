'use strict'

const Joi = require('joi')

const bookshelf = require('models').bookshelf
const Organization = require('models/organization')

const NotFoundError = require('errors/not-found-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

/**
 * Schema for organization.integration.prbot.enabled jobs.
 * @type {Joi~Schema}
 */
module.exports.jobSchema = Joi.object({
  tid: Joi.string().guid(),
  organization: Joi.object({
    id: Joi.number().required()
  }).required()
}).required().label('Organization.integration.prbot.disabled')

/**
 * Sets the prBotEnabled flag on the Organization to true
 *
 * @param {Object}   job                 - job passed by RabbitMQ
 * @param {Number}   job.organization.id - Big Poppa ID for Organization to be updated
 * @return {Promise}
 */
module.exports.task = function PrBotEnabled (job) {
  return bookshelf.transaction(t => {
    let opts = { transacting: t }
    return Organization.fetchById(job.organization.id, opts)
      .then(function (org) {
        if (!org.get('prBotEnabled')) {
          return org.save({
            prBotEnabled: true
          }, opts)
        }
        throw new WorkerStopError('Organization was not updated. PrBotEnabled is already set')
      })
  })
    .catch(NotFoundError, err => {
      throw new WorkerStopError(
        `Organization was not updated. This organization does not seem to exist: ${err.toString()}`,
        { err: err }
      )
    })
}
