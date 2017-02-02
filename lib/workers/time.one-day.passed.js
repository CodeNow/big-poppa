'use strict'

const Joi = require('joi')
const Promise = require('bluebird')

const rabbitMQ = require('util/rabbitmq')
const logger = require('util/logger').child({ module: 'worker/time.one-day.passed' })

const WorkerStopError = require('error-cat/errors/worker-stop-error')
/**
 * Schema for timekeeping event jobs.
 * @type {Joi~Schema}
 */
module.exports.jobSchema = Joi.object({}).unknown()

/**
 * Triggers various tasks that must be performed daily
 *
 * @param {Object}   job - job passed by RabbitMQ
 * @return {Promise}
 */
module.exports.task = function PublishDailyTasks (job) {
  const log = logger.child({ job, method: 'PublishDailyTasks' })
  // Add any daily bigPoppa tasks here
  log.info('Publishing daily tasks')
  return Promise.all([
    rabbitMQ.publishTask(
      'organization.cleanup',
      {}
    ),
    rabbitMQ.publishTask(
      'trials.cleanup',
      {}
    )
  ])
  .catch(err => {
    throw new WorkerStopError(
      'Error publishing daily tasks.',
      { err }
    )
  })
}
