'use strict'

const Joi = require('joi')
const Promise = require('bluebird')

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
 * @param {Object}   job - job passed by RabbitMQ
 * @return {Promise}
 */
module.exports.task = function OrganizationCleanup (job) {
  const log = logger.child({ job, method: 'OrganizationCleanup' })
  return bookshelf.transaction(t => {
    return orion.companies.listBy({ segment_id: TrialsToKillSegmentId })
      .then((res) => {
        if (!res) {
          throw new Error('Failed to find orgs to kill in Intercom.')
        }
        var companies = res.companies

        function getAllCompanies (page) {
          page.companies.map((company) => {
            companies.push(company)
          })
          if (page.pages.page < page.pages.total_pages) {
            return orion.nextPage(page.pages)
              .then((nextPage) => {
                return getAllCompanies(nextPage)
              })
          } else {
            return companies
          }
        }

        return getAllCompanies(res)
      })
      .then((orgs) => {
        return orgs
          .map((o) => {
            return {
              id: o.custom_attributes.github_id,
              name: o.name
            }
          })
      })
      .then(orgs => {
        log.info(`Cleaning up ${orgs.length} accounts.`)
        // Promise.map does not play well with bookshelf.js
        return Promise.all(orgs.map(org => {
          log.info({ orgId: org.get('id'), orgName: org.get('name') }, 'Disabling Runnable trial org.')
          return org.save({ isActive: false }, { transacting: t })
        }))
      })
      .catch(err => {
        throw new WorkerStopError(
          'Something went wrong during organization cleanup.',
          { err }
        )
      })
}
