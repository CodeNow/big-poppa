'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const logger = require('../logger').child({ module: 'worker/organization.create' })
const Util = require('../../common/util')
const Organization = require('../../common/models').Organization

const workerName = 'organization.delete'

/**
 * Schema for organization.delete jobs.
 * @type {Joi~Schema}
 */
const jobSchema = Joi.object({
  githubId: Joi.number().required()
})

/**
 *
 * @param {object}
 * @return {Promise}
 */
module.exports = function DeleteOrganization (job) {
  const log = logger.child({ job: job, method: 'DeleteOrganization' })
  return Joi.validateAsync(job, jobSchema)
    .then(() => {
      log.info('DeleteOrganization called')
      return new Organization({ github_id: job.githubId })
        .destroy({ require: true })
        .catch(Util.castDatabaseError)
        .tap((hello) => {
          console.log(hello)
          log.trace('Organization destroyed')
        })
    })
    .catch(Organization.NoRowsDeletedError, (err) => {
      throw new WorkerStopError(
        `No rows deleted. This organization does not seem to exist: ${err.toString()}`,
        { err: err }
      )
    })
    .catch((err) => {
      if (err.isJoi) {
        throw new WorkerStopError(
          `Invalid Job: ${err.toString()}`,
          { err: err }
        )
      }
      throw err
    })
}
