'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const logger = require('../logger').child({ module: 'worker/organization.user.add' })
const Organization = require('../../common/models/organization')

/**
 * Schema for organization.user.add jobs.
 * @type {Joi~Schema}
 */
const jobSchema = Joi.object({
  organizationGithubId: Joi.number().required(),
  userGithubId: Joi.number().required()
})

/**
 *
 * @param {object}
 * @return {Promise}
 */
module.exports = function RemoveUserFromOrganization (rawJob) {
  const log = logger.child({ job: rawJob, method: 'RemoveUserFromOrganization' })
  return Joi.validateAsync(rawJob, jobSchema)
    .then((job) => {
      log.info('RemoveUserFromOrganization called')
      return Organization.removeUser(job.organizationGithubId, job.userGithubId)
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
