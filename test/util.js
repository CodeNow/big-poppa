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
          knex('organizations').del(),
          knex('users').del()
        ])
      })
  }

  static createUserAndOrg (orgGithubId, userGithubId) {
    return Promise.props({
      user: new User().save({ githubId: userGithubId }),
      org: Organization.create(orgGithubId)
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
}
