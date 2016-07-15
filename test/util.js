'use strict'

const Promise = require('bluebird')
const bookshelf = require('models').bookshelf
const knex = bookshelf.knex

const User = require('models/user')
const Organization = require('models/organization')

module.exports = class TestUtil {

  static truncateAllTables () {
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
    return Promise.props({
      user: new User().save({ github_id: userGithubId }),
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
}
