'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))
const moment = require('moment')
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const UniqueError = require('../../common/errors/unique-error')

const logger = require('../logger').child({ module: 'worker/organization.create' })
const Util = require('../../common/util')
const GithubAPI = require('../../common/github')
const Organization = require('../../common/models').Organization

/**
 * Schema for organization.create jobs.
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
module.exports = function CreateOrganization (job) {
  const log = logger.child({ job: job, method: 'CreateOrganization' })
  return Joi.validateAsync(job, jobSchema)
    .then(() => {
      log.info('CreateOrganization called')
      return GithubAPI.isOrganization(job.githubId)
        .then((org) => {
          if (!org) {
            throw new WorkerStopError('Provided github ID is not a github organization.')
          }
          log.trace({ org: org }, 'Organization fetched from Github')
          return Organization
            .forge()
            .save({
              // By default all newly created orgs should be inactive
              github_id: job.githubId,
              trial_end: moment().utc().toDate(),
              active_period_end: moment().utc().toDate(),
              grace_period_end: moment().utc().toDate()
            })
            .catch(Util.castDatabaseError)
        })
        .tap((model) => {
          log.trace({ model: model }, 'Organization saved')
        })
    })
    .catch(UniqueError, (err) => {
      throw new WorkerStopError(
        `Organization with id already exists: ${err.toString()}`,
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
