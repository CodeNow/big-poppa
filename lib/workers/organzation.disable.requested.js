'use strict'

const Joi = require('joi')
const Promise = require('bluebird')

const bookshelf = require('models').bookshelf
const Organization = require('models/organization')

const logger = require('util/logger').child({ module: 'worker/organization.disable.requested' })
const WorkerStopError = require('error-cat/errors/worker-stop-error')

/**
 * Schema for organization.disable.requested jobs.
 * @type {Joi~Schema}
 */
module.exports.jobSchema = Joi.object({
  tid: Joi.string().guid(),
  orgName: Joi.string().required()
}).required().label('Organization.disable.requested')


/**
 * Sets the isActive and hasPaymentMethod flag on the Organization to false
 *
 * @param {Object}   job - job passed by RabbitMQ
 * @return {Promise}
 */
module.exports.task = function OrganizationDisableRequested (job) {
  const log = logger.child({ job, method: 'OrganizationDisableRequested' })
  return 


  bookshelf.transaction(t => {
    return Organization.collection()
      .query(qb => qb.where('lower_name', '=', job.orgName))
      .fetch()
      .tap(org => log.info(org,'DEEZ'))
      .then(org => {
          log.info({ orgId: org.get('id'), orgName: org.get('name') }, 'Disabling Runnable org.')
          return org.save({ isActive: false, hasPaymentMethod: false}, { transacting: t })
      })
  })
    .catch(err => {
      throw new WorkerStopError(
        'Something went wrong during organization disable.',
        { err }
      )
    })
}
