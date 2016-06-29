'use strict'

const Promise = require('bluebird')
const bookshelf = require('common/models').bookshelf
const knex = bookshelf.knex

const User = require('common/models/user')
const Organization = require('common/models/organization')

module.exports = class TestUtil {

  static trundateAllTables () {
    return Promise.all([
      knex('organization_user').truncate(),
      // Cannot truncate because of foreign key constraint
      knex('organization').del(),
      knex('user').del()
    ])
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
