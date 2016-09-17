'use strict'

const Promise = require('bluebird')
const bookshelf = require('models').bookshelf
const knex = bookshelf.knex

const User = require('models/user')
const Organization = require('models/organization')

module.exports = class TestUtil {

  static truncateAllTables () {
    return knex('organizations_users').truncate()
      .then(() => {
        return Promise.all([
          // Cannot truncate because of foreign key constraint
          knex('organizations_users').del(),
          knex('organizations').del(),
          knex('users').del()
        ])
      })
  }

  static createUser (userGithubId, token) {
    return new User().save({
      accessToken: token || process.env.GITHUB_TOKEN || 'testing',
      githubId: userGithubId
    })
  }

  static createUserAndOrg (orgGithubId, userGithubId) {
    return new User().save({
      accessToken: process.env.GITHUB_TOKEN || 'testing',
      githubId: userGithubId
    })
    .then(user => {
      return Promise.props({
        user,
        org: Organization.create(orgGithubId, user)
      })
    })
  }

  static createAttachedUserAndOrg (orgGithubId, userGithubId) {
    return this.createUserAndOrg(orgGithubId, userGithubId)
      .tap(res => {
        let user = res.user
        let org = res.org
        return org.users().attach(user.get(user.idAttribute))
      })
  }

  static createTwoAttachedUsersAndOrg (orgGithubId, userGithubId1, userGithubId2) {
    let org
    return this.createUserAndOrg(orgGithubId, userGithubId1)
      .tap(res => {
        let user = res.user
        org = res.org
        return org.users().attach(user.get(user.idAttribute))
      })
      .then(() => {
        return this.createUser(userGithubId2)
        .then(newUser => {
          return org.users().attach(newUser.get(newUser.idAttribute))
        })
      })
  }

  static poll (handler, interval, timeout) {
    function pollRecursive () {
      return handler()
        .then(bool => {
          if (bool) return true
          return Promise.delay(interval).then(pollRecursive)
        })
    }

    return pollRecursive()
      .timeout(timeout)
  }

  static throwIfSuccess () {
    throw new Error('Should not be called')
  }
}
