'use strict'

const Promise = require('bluebird')
const bookshelf = require('models').bookshelf
const knex = bookshelf.knex

const User = require('models/user')
const Organization = require('models/organization')

module.exports = class TestUtil {

  static trundateAllTables () {
    return knex('organizations_users').truncate()
      .then(() => {
        return Promise.all([
          // Cannot truncate because of foreign key constraint
          knex('organizations_with_deleted').del(),
          knex('users_with_deleted').del()
        ])
      })
  }

  static createUserAndOrg (orgGithubId, userGithubId) {
    return Promise.all([
      new User().save({ github_id: userGithubId }),
      Organization.create(orgGithubId)
    ])
  }

  static createAttachedUserAndOrg (orgGithubId, userGithubId) {
    return this.createUserAndOrg(orgGithubId, userGithubId)
      .spread((user, org) => {
        return org.users().attach(user.get(user.idAttribute))
      })
  }
}
