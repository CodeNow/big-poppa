'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))
const orion = require('@runnable/orion')
const moment = require('moment')

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
  tid: Joi.string().guid(),
  githubId: Joi.number().required(),
  creator: Joi.object({
    githubId: Joi.number().required(),
    githubUsername: Joi.string().required(),
    email: Joi.string().required(),
    created: Joi.date().iso().required()
  }).unknown().required()
})

/**
 * Creates new Organization.
 *
 * @param {Object} rawJob                        - job passed by RabbitMQ
 * @param {Number} rawJob.githubId               - Github ID for new Organization
 * @param {Object} rawJob.creator                - Object with creator user details
 * @param {Number} rawJob.creator.githubId       - Creator's githubId
 * @param {String} rawJob.creator.githubUsername - Creator's github login
 * @param {String} rawJob.creator.email          - Creator's email address
 * @param {Date}   rawJob.creator.created        - Date the user was created
 *
 * @resolves {Organization}    the newly created organization
 * @throws   {WorkerStopError} on Joi violation
 * @throws   {WorkerStopError} when the github query fails
 */
module.exports = function CreateOrganization (rawJob) {
  const log = logger.child({ job: rawJob, method: 'CreateOrganization' })
  return Joi.validateAsync(rawJob, jobSchema)
    .then(job => {
      log.info('CreateOrganization called')
      const githubApi = new GithubAPI()
      return githubApi.getOrganization(job.githubId)
        .then(function (githubOrg) {
          return Organization.create(job.githubId, githubOrg.login)
            .catch(UniqueError, err => {
              // Necessary to make worker idempotent
              // Since something else might have failed, we can allow
              log.trace(
                { err: err },
                `Organization with id already exists: ${err.toString()}`
              )
              return Organization.fetchByGithubId(job.githubId)
            })
            .then(function getOrganizationFromGithub (org) {
              return Promise.props({
                org: org,
                githubOrg: githubOrg
              })
            })
        })
        .catch(GithubEntityError, err => {
          throw new WorkerStopError(
            `Error fetching organization from Github: ${err.toString()}`,
            { err: err }
          )
        })
        .tap(() => {
          log.trace('Create user org relationship')
          return rabbitMQ.publishOrganizationUserAdd({
            tid: rawJob.tid,
            organizationGithubId: rawJob.githubId,
            userGithubId: rawJob.creator.githubId
          })
        })
        .tap(function createCompanyInIntercom (res) {
          let githubOrg = res.githubOrg
          log.trace('Create intercom user')
          return orion.users.create({
            name: job.creator.githubUsername,
            email: job.creator.email,
            created_at: +(moment(job.creator.created).format('X')),
            update_last_request_at: true,
            companies: [ {
              company_id: githubOrg.login.toLowerCase(),
              name: githubOrg.login,
              remote_created_at: Math.floor(new Date().getTime() / 1000)
            } ]
          })
        })
        .tap(function enqueueASGCreateJob (res) {
          let githubOrg = res.githubOrg
          log.trace({ githubId: githubOrg.id.toString() }, 'Publish ASG Create')
          return rabbitMQ.publishASGCreate({
            githubId: githubOrg.id.toString()
          })
        })
        .tap(function publishOrganizationCretedEvent (res) {
          let githubOrg = res.githubOrg
          let org = res.org
          log.trace({
            githubId: githubOrg.id.toString(),
            orgName: githubOrg.login
          }, 'Publish Organization Crated')
          return rabbitMQ.publishOrganizationCreated({
            organization: {
              id: org.id,
              githubId: githubOrg.id,
              name: githubOrg.login
            },
            createdAt: moment(org.createdAt).toISOString()
          })
        })
        .then(res => res.org) // Return original database entry
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
