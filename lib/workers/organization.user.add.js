'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))

const logger = require('util/logger').child({ module: 'worker/organization.user.add' })
const Organization = require('models/organization')
const User = require('models/user')

const NotFoundError = require('errors/not-found-error')
const UniqueError = require('errors/unique-error')
const GithubEntityNoPermissionError = require('errors/github-entity-no-permission-error')
const ValidationError = require('errors/validation-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

/**
 * Schema for organization.user.add jobs.
 * @type {Joi~Schema}
 */
module.exports.jobSchema = Joi.object({
  tid: Joi.string().guid(),
  organizationGithubId: Joi.number().required(),
  userGithubId: Joi.number().required()
})

/**
 * Adds a user to an organization
 *
 * @param {Object}    rawJob                      - job passed by RabbitMQ
 * @param {Number}    rawJob.organizationGithubId - Github ID for existing organization
 * @param {Number}    rawJob.userGithubId         - Github ID for exiting user
 *
 * @resolves {User}            the user that was added, which should now feature the attached org
 * @throws   {WorkerStopError} on Joi violation
 * @throws   {WorkerStopError} when the relationship already exists
 * @throws   {WorkerStopError} when the github query fails
 */
module.exports.task = function AddUserToOrganization (job) {
  const log = logger.child({ job: job, method: 'AddUserToOrganization' })
  return Promise.props({
    org: Organization.fetchByGithubId(job.organizationGithubId),
    user: User.fetchByGithubId(job.userGithubId)
  })
    .tap(res => {
      return res.org.addUser(res.user)
    })
    .tap(function publishEvent (res) {
      log.trace({
        organizationId: res.org.get(res.org.idAttribute),
        organizationGithubId: res.org.get('githubId'),
        userId: res.user.get(res.user.idAttribute),
        userGithubId: res.user.get('githubId')
      }, 'Publish User added to Organization')
    })
    .catch(ValidationError, err => {
      throw new WorkerStopError(
        `ValidationError: ${err.toString()}`,
        { err }
      )
    })
    .catch(GithubEntityNoPermissionError, err => {
      throw new WorkerStopError(
        `User is not part of this Github Organization: ${err.toString()}`,
        { err }
      )
    })
    .catch(NotFoundError, err => {
      throw new WorkerStopError(
        `Organization or user was not found. This organization/user does not seem to exist: ${err.toString()}`,
        { err }
      )
    })
    .catch(UniqueError, err => {
      throw new WorkerStopError(
        `User already added to organization: ${err.toString()}`,
        { err }
      )
    })
}
