'use strict'

require('loadenv')()
const GithubAPI = require('util/github')
const log = require('../lib/util/logger').child({ module: 'migrations/add_stripe_subscription_field' })

const TABLE_NAME = 'organizations'
const NEW_PROPERTY = 'is_personal_account'

exports.up = function (knex, Promise) {
  var modifyTable = knex.schema.table(TABLE_NAME, function addField (table) {
    log.trace('Add `stripe_subscription_id` field')
    table.boolean(NEW_PROPERTY).defaultTo(false).notNullable()
  })
  .then(function () {
    // Add subscription IDs to all organizations
    return knex(TABLE_NAME).select(['organizations.id', 'organizations.github_id', 'users.github_id as user_github_id', 'users.access_token'])
      .innerJoin('users', `${TABLE_NAME}.creator`, 'users.id')
  })
  .then(function (organizations) {
    return Promise.all(organizations.map(function (org) {
      log.trace({ org }, 'Getting Github organization')
      const githubApi = new GithubAPI(org.access_token)
      return githubApi.getOrganization(org.github_id)
      .catch(function () {
        log.trace({ org }, 'No organization found. Getting Github user')
        return githubApi.getUser(org.user_github_id)
        .then(function () {
          const updates = {}
          updates[NEW_PROPERTY] = true
          log.trace({ org, updates }, 'Updating organization')
          return knex(TABLE_NAME)
          .where('id', org.id)
          .update(updates)
        })
        .catch(function (err) {
          log.trace({ org, err }, 'Neither organization nor user found. Assuming deleted org.')
        })
      })
    }))
  })
  .then(function () {
    throw new Error('DONT DON ANYTHING')
  })
  log.trace(modifyTable.toString())
  return modifyTable
}

exports.down = function (knex, Promise) {
  var modifyTable = knex.schema.table('organizations', function (table) {
    table.dropColumn(NEW_PROPERTY)
  })
  log.trace(modifyTable.toString())
  return modifyTable
}
