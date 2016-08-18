'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))
const moment = require('moment')
const orion = require('@runnable/orion')

const logger = require('util/logger').child({ module: 'worker/organization.user.add' })
const GithubAPI = require('util/github')
const Organization = require('models/organization')
const User = require('models/user')

const NotFoundError = require('errors/not-found-error')
const GithubEntityNoPermissionError = require('errors/github-entity-no-permission-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

/**
 * Schema for organization.user.add jobs.
 * @type {Joi~Schema}
 */
module.exports.jobSchema = Joi.object({
  tid: Joi.string().guid(),
  organization: Joi.object({
    id: Joi.number().required(),
    githubId: Joi.number().required()
  }).required(),
  user: Joi.object({
    id: Joi.number().required(),
    githubId: Joi.number().required()
  }).required().label('Organization.user.added')
})

/**
 * Adds a user to an organization
 *
 * @param {Object}    job                       - job passed by RabbitMQ
 * @param {Object}    job.organization          - organization that was just added to
 * @param {Number}    job.organization.id       - PostGres Id for existing organization
 * @param {Number}    job.organization.githubId - Github ID for existing organization
 * @param {Object}    job.user                  - user that was just added to the org
 * @param {Number}    job.user.id               - PostGres Id for existing user
 * @param {Number}    job.user.githubId         - Github ID for existing user
 *
 * @resolves {User}            the user that was added, which should now feature the attached org
 * @throws   {WorkerStopError} on Joi violation
 * @throws   {WorkerStopError} when the relationship already exists
 * @throws   {WorkerStopError} when the github query fails
 */
module.exports.task = function UserAddedToOrg (job) {
  const log = logger.child({ job: job, method: 'UserAddedToOrg' })
  log.info('AddUserToOrganization called')
  return User.fetchById(job.user.id)
    .then(user => {
      const githubApi = new GithubAPI(user.get('accessToken'))
      return Promise.props({
        org: Organization.fetchById(job.organization.id),
        user: user,
        githubUser: githubApi.getSelf(),
        emailAddress: githubApi.getPrimaryEmailAddress(job.user.githubId)
      })
    })
    .tap(res => {
      log.info({
        org: res.org,
        githubUser: res.githubUser,
        emailAddress: res.emailAddress
      }, 'AddUserToOrganization called')
      return orion.users.create({
        name: res.githubUser.login,
        email: res.emailAddress,
        custom_attributes: {
          user_id: res.user.get(res.user.idAttribute)
        },
        created_at: +(moment(res.user.get('created')).format('X')),
        update_last_request_at: true,
        companies: [ {
          company_id: res.org.get('name').toLowerCase(),
          name: res.org.get('name'),
          remote_created_at: Math.floor(new Date().getTime() / 1000),
          custom_attributes: {
            github_id: res.org.get('githubId')
          }
        } ]
      })
    })
    .catch(NotFoundError, err => {
      throw new WorkerStopError(
        `Organization or user was not found. This organization/user does not seem to exist: ${err.toString()}`,
        { err: err }
      )
    })
    .catch(NotFoundError, err => {
      throw new WorkerStopError(
        `Organization or user was not found. This organization/user does not seem to exist: ${err.toString()}`,
        { err: err }
      )
    })
}
