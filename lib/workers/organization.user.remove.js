'use strict'

const Promise = require('bluebird')
const Joi = require('joi')

const logger = require('util/logger').child({ module: 'worker/organization.user.add' })
const Organization = require('models/organization')
const User = require('models/user')
const rabbitMQ = require('util/rabbitmq')

const NotFoundError = require('errors/not-found-error')
const NoRowsDeletedError = require('errors/no-rows-deleted-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

/**
 * Schema for organization.user.remove jobs.
 * @type {Joi~Schema}
 */
module.exports.jobSchema = Joi.object({
  tid: Joi.string().guid(),
  organizationGithubId: Joi.number().required(),
  userGithubId: Joi.number().required()
})

/**
 * Removes a user from an organization
 *
 * @param {Object}    job                      - job passed by RabbitMQ
 * @param {Number}    job.organizationGithubId - Github ID for existing organization
 * @param {Number}    job.userGithubId         - Github ID for exiting user
 * @return {Promise}
 */
module.exports.task = function RemoveUserFromOrganization (job) {
  const log = logger.child({ job: job, method: 'RemoveUserFromOrganization' })
  return Promise.props({
    org: Organization.fetchByGithubId(job.organizationGithubId),
    user: User.fetchByGithubId(job.userGithubId)
  })
  .tap(res => {
    return res.org.removeUser(res.user)
  })
  .tap(function publishEvent (res) {
    log.trace({
      organizationId: res.org.get(res.org.idAttribute),
      organizationGithubId: res.org.get('githubId'),
      userId: res.user.get(res.user.idAttribute),
      userGithubId: res.user.get('githubId')
    }, 'Publish User remove from Organization')
    return rabbitMQ.publishEvent(
      'organization.user.removed',
      {
        organization: {
          id: res.org.id,
          githubId: res.org.get('githubId')
        },
        user: {
          id: res.user.id,
          githubId: res.user.get('githubId')
        }
      }
    )
  })
  .catch(NotFoundError, err => {
    throw new WorkerStopError(
      `Organization or user was not found. This organization/user does not seem to exist: ${err.toString()}`,
      { err: err }
    )
  })
  .catch(NoRowsDeletedError, err => {
    throw new WorkerStopError(
      `No users were removed from organization: ${err.toString()}`,
      { err: err }
    )
  })
}
