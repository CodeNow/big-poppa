'use strict'

const Promise = require('bluebird')
const bookshelf = require('models').bookshelf
const knex = bookshelf.knex

const User = require('models/user')
const Organization = require('models/organization')

module.exports = class TestUtil {

  static trundateAllTables () {
    return knex('organization_user').truncate()
      .then(() => {
        return Promise.all([
          // Cannot truncate because of foreign key constraint
          knex('organization').del(),
          knex('user').del()
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
