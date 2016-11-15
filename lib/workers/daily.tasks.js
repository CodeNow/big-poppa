'use strict'

const Joi = require('joi')
const Promise = require('bluebird')

const rabbitMQ = require('util/rabbitmq')
const logger = require('util/logger').child({ module: 'worker/daily.tasks' })

/**
 * Schema for timekeeping event jobs.
 * @type {Joi~Schema}
 */
module.exports.jobSchema = Joi.object({}).unknown()

/**
 * Triggers various tasks that must be performed daily
 *
 * @param {Object}   job                 - job passed by RabbitMQ
 * @return {Promise}
 */
module.exports.task = function PublishDailyTasks (job) {
  const log = logger.child({ job: job, method: 'PublishDailyTasks' })
  return Promise.all([
    rabbitMQ.publishTask(
      'organization.cleanup',
      {}
    )
  ])
  .then(() => {
    log.info('Published Daily Tasks for BigPoppa')
  })
}
