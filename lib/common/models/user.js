'use strict'

const logger = require('../logger').create('models', {}).child({ module: 'models/organization' })
const Util = require('../util')
const GithubAPI = require('../github')

const UserModel = require('../models').User
const OrganizationModel = require('../models').Organization

const GithubEntityError = require('../errors/github-entity-error')
const NoRowsDeletedError = require('../errors/no-rows-deleted-error')

module.exports = class User {

  static create (githubId) {
    const log = logger.child({ githubId: githubId, method: 'User.create' })
    log.info('User.create called')
    return GithubAPI.isUser(githubId)
      .then(user => {
        if (!user) {
          throw new GithubEntityError('Provided github ID is not a github user.')
        }
        log.trace({ user: user }, 'User fetched from Github')
        return UserModel
          .forge()
          .save({
            github_id: githubId
          })
          .catch(Util.castDatabaseError)
      })
      .tap((model) => {
        log.trace({ model: model }, 'User saved')
      })
  }

  static delete (githubId) {
    const log = logger.child({ githubId: githubId, method: 'User.delete' })
    log.info('User.delete called')
    return new UserModel({ github_id: githubId })
      .destroy({ require: true })
      .catch(Util.castDatabaseError)
      .catch(UserModel.NoRowsDeletedError, err => {
        throw new NoRowsDeletedError(err)
      })
      .tap(() => {
        log.trace('User destroyed')
      })
  }

  static getAllUserOrgsIds (githubId) {
    const log = logger.child({ githubId: githubId, method: 'User.getAllUserOrgs' })
    log.info('User.getAllUserOrgs called')
    return OrganizationModel.collection()
      .query(q => {
        return q
          .innerJoin('organization_user', function () {
            this.on('organization_user.organization_github_id', '=', 'organization.github_id')
          })
          .where('user_github_id', githubId)
      })
      .fetch()
      .then(coll => coll.pluck('github_id'))
  }

}
