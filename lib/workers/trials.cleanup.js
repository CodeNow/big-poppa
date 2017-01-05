'use strict'

const Joi = require('joi')
const Promise = require('bluebird')

const Bookshelf = require('models').bookshelf
const Organization = require('models/organization')

const logger = require('util/logger').child({ module: 'worker/trials.cleanup' })
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const Orion = require('@runnable/orion')

/**
 * Schema for trials.cleanup jobs.
 * @type {Joi~Schema}
 */
module.exports.jobSchema = Joi.object({}).unknown()

/**
 * Sets the isActive flag on the Organization to false
 *
 * @param {Object}   job - job passed by RabbitMQ
 * @return {Promise}
 */
module.exports.task = function TrialsCleanup (job) {
  const log = logger.child({ job, method: 'TrialsCleanup' })
  return Orion.companies.listBy({ segment_id: process.env.INTERCOM_KILLTRIALS_SEGMENT_ID })
    .then((res) => {
      if (!res) {
        throw new WorkerStopError('Failed to find orgs to kill in Intercom.')
      }
      var companies = []

      function getAllCompanies (page) {
        page.companies.map((company) => {
          companies.push(company)
        })
        if (page.pages.page < page.pages.total_pages) {
          return Orion.nextPage(page.pages)
            .then((nextPage) => {
              return getAllCompanies(nextPage)
            })
        } else {
          return companies
        }
      }
      return getAllCompanies(res)
    })
    .then((companies) => {
      return companies.map((o) => {
        return o.custom_attributes.github_id
      })
    })
    .then((companies) => {
      return Promise.all(companies.map(githubId => {
        if (!githubId) {
          log.error('Intercom company missing github orgId')
          return
        }
        return Bookshelf.transaction(transacting => {
          return Organization.fetchByGithubId(githubId, { forUpdate: true, transacting })
            .then(org => {
              log.info({ orgId: org.get('id'), orgName: org.get('name') }, 'Disabling Runnable trial org.')
              return org.save({ isActive: false }, { transacting })
            })
        })
      }))
    })
    .catch(err => {
      throw new WorkerStopError(
        'Something went wrong during trials cleanup.',
        { err }
      )
    })
}
