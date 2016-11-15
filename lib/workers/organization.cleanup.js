'use strict'

const Joi = require('joi')

const bookshelf = require('models').bookshelf
const Organization = require('models/organization')

const logger = require('util/logger').child({ module: 'worker/organization.cleanup' })
const WorkerStopError = require('error-cat/errors/worker-stop-error')

/**
 * Schema for organization.cleanup jobs.
 * @type {Joi~Schema}
 */
module.exports.jobSchema = Joi.object({}).unknown()

/**
 * Sets the OrganizationCleanup flag on the Organization to false
 *
 * @param {Object}   job                 - job passed by RabbitMQ
 * @return {Promise}
 */
module.exports.task = function OrganizationCleanup (job) {
  const log = logger.child({ job: job, method: 'OrganizationCleanup' })
  return bookshelf.transaction(t => {
    let opts = { transacting: t }
    return Organization.collection()
      .query(qb => qb.where('lower_name', 'LIKE', 'p4l-'))
      .fetch()
      .then(orgs => {
        return orgs.map((org) => {
          log.info(org.lowerName || 'Invalid org')
          return org.save({
            isActive: false
          }, opts)
        })
      })
      .catch((err) => {
        throw new WorkerStopError('Something went wrong during organization cleanup.', { err: err })
      })
  })
}
