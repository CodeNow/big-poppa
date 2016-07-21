'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))
const orion = require('@runnable/orion')

const logger = require('util/logger').child({ module: 'worker/organization.create' })
const Organization = require('models/organization')
const GithubAPI = require('util/github')
const rabbitMQ = require('util/rabbitmq')

const GithubEntityError = require('errors/github-entity-error')
const UniqueError = require('errors/unique-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

/**
 * Schema for organization.create jobs.
 * @type {Joi~Schema}
 */
const jobSchema = Joi.object({
  githubId: Joi.number().required(),
  creator: Joi.object({
    githubUsername: Joi.string().required(),
    email: Joi.string().required(),
    created: Joi.date().timestamp('unix').required()
  }).unknown().required()
})

/**
 * Creates new Organization.
 *
 * @param {Object}    job          - job passed by RabbitMQ
 * @param {Number}    job.githubId - Github ID for new Organization
 * @return {Promise}
 */
module.exports = function CreateOrganization (rawJob) {
  const log = logger.child({ job: rawJob, method: 'CreateOrganization' })
  return Joi.validateAsync(rawJob, jobSchema)
    .then(job => {
      log.info('CreateOrganization called')
      return Organization.create(job.githubId)
        .catch(UniqueError, err => {
          // Necessary to make worker idempotent
          // Since something else might have failed, we can allow
          log.trace(
            { err: err },
            `Organization with id already exists: ${err.toString()}`
          )
          return Organization.fetchByGithubId(job.githubId)
        })
        .then(org => {
          return Promise.props({
            org: org,
            githubOrg: GithubAPI.getOrganization(job.githubId)
          })
        })
        .tap(res => {
          let githubOrg = res.githubOrg
          log.trace('Create intercom user')
          return orion.users.create({
            name: job.creator.githubUsername,
            email: job.creator.email,
            created_at: new Date(job.creator.created) / 1000 || 0,
            update_last_request_at: true,
            companies: [{
              company_id: githubOrg.login.toLowerCase(),
              name: githubOrg.login,
              remote_created_at: Math.floor(new Date().getTime() / 1000)
            }]
          })
        })
        .tap(res => {
          let githubOrg = res.githubOrg
          log.trace({ githubId: githubOrg.id.toString() }, 'Publish ASG Create')
          rabbitMQ.publishASGCreate({
            githubId: githubOrg.id.toString()
          })
        })
        .tap(res => {
          let githubOrg = res.githubOrg
          log.trace({
            githubId: githubOrg.id.toString(),
            orgName: githubOrg.login
          }, 'Publish Organization Crated')
          rabbitMQ.publishOrganizationCreated({
            githubId: githubOrg.id.toString(),
            orgName: githubOrg.login,
            createdAt: Math.floor(new Date().getTime() / 1000)
          })
        })
        .then(res => res.org) // Return original database entry
    })
    .catch(GithubEntityError, err => {
      throw new WorkerStopError(
        `Error fetching organization from Github: ${err.toString()}`,
        { err: err }
      )
    })
    .catch(err => {
      if (err.isJoi) {
        throw new WorkerStopError(
          `Invalid Job: ${err.toString()}`,
          { err: err }
        )
      }
      throw err
    })
}
