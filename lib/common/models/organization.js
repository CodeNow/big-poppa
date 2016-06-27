'use strict'

const moment = require('moment')

const logger = require('../logger').create('models', {}).child({ module: 'models/organization' })
const Util = require('../util')
const GithubAPI = require('../github')

const OrganizationModel = require('../models').Organization
const UserModel = require('../models').User

const GithubEntityError = require('../errors/github-entity-error')
const NoRowsDeletedError = require('../errors/no-rows-deleted-error')

module.exports = class Organization {

  static create (githubId) {
    const log = logger.child({ githubId: githubId, method: 'Orgainization.create' })
    log.info('Organization.create called')
    return GithubAPI.isOrganization(githubId)
      .then(org => {
        if (!org) {
          throw new GithubEntityError('Provided github ID is not a github organization.')
        }
        log.trace({ org: org }, 'Organization fetched from Github')
        return OrganizationModel
          .forge()
          .save({
            // By default all newly created orgs should be inactive
            github_id: githubId,
            trial_end: moment().utc().toDate(),
            active_period_end: moment().utc().toDate(),
            grace_period_end: moment().utc().toDate()
          })
          .catch(Util.castDatabaseError)
      })
      .tap(model => {
        log.trace({ model: model }, 'Organization added')
      })
  }

  static destroy (githubId) {
    const log = logger.child({ githubId: githubId, method: 'Orgainization.destro' })
    log.info('Organization.destroy called')
    return new OrganizationModel({ github_id: githubId })
      .destroy({ require: true })
      .catch(Util.castDatabaseError)
      .catch(OrganizationModel.NoRowsDeletedError, err => {
        throw new NoRowsDeletedError(err)
      })
      .tap(() => {
        log.trace('Organization destroyed')
      })
  }

  static addUser (organizationGithubId, userGithubId) {
    const log = logger.child({
      organizationGithubId: organizationGithubId,
      userGithubId: userGithubId,
      method: 'Orgainization.addUser'
    })
    log.info('Organization.addUser called')
    return new UserModel({ github_id: userGithubId })
      .fetch()
      .then(user => {
        if (!user) {
          // TODO: Change name of error
          throw new GithubEntityError('User does not exist')
        }
        return OrganizationModel.forge({ github_id: organizationGithubId })
          .users()
          .attach(userGithubId)
      })
      .catch(Util.castDatabaseError)
      .tap(model => {
        log.trace({ model: model }, 'User added to organization')
      })
  }

  static removeUser (organizationGithubId, userGithubId) {
    const log = logger.child({
      organizationGithubId: organizationGithubId,
      userGithubId: userGithubId,
      method: 'Orgainization.removeUser'
    })
    log.info('Organization.removeUser called')
    return new UserModel({ github_id: userGithubId })
      .fetch()
      .then(user => {
        if (!user) {
          // TODO: Change error
          throw new GithubEntityError('User does not exist')
        }
        // TODO: Should throw an error if it doesn't exist
        return OrganizationModel.forge({ github_id: organizationGithubId })
          .users()
          .detach(userGithubId)
      })
      .catch(Util.castDatabaseError)
      .tap(() => {
        log.trace('User removed from organization')
      })
  }

}
