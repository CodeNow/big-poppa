'use strict'

let debug = require('debug')('big-poppa:migration')

const orgUsersTableName = 'organizations_users'
const orgTableName = 'organizations'
const usersTableName = 'users'
const log = require('../lib/util/logger').child({ module: 'migrations/add_org_creator' })

// Get the first created user for every organization
const JOIN_QUERY = `
  SELECT DISTINCT ON (organizations.id) organizations.id, user_id, users.created_at
  FROM ${orgUsersTableName}
  INNER JOIN ${orgTableName}
  ON ${orgTableName}.id = ${orgUsersTableName}.organization_id
  INNER JOIN ${usersTableName}
  ON users.id = ${orgUsersTableName}.user_id
  ORDER BY ${orgTableName}.id, ${usersTableName}.created_at DESC
`
// Update the creator field with a user that already belongs to an org
const UPDATE_QUERY = `
  UPDATE ${orgTableName}
  SET creator = org.user_id
  FROM (
    ${JOIN_QUERY}
  ) org;
`

log.info({ UPDATE_QUERY }, 'Update query')

exports.up = function (knex, Promise) {
  var modifyTable = knex.schema.table('organizations', function addField (table) {
    // Currently nullable, but will later be not-nullable after we migrate
    // all organizations
    log.trace('Add `creator` field')
    table.integer('creator')
      .notNullable()
      .defaultTo(0)
  })
  .then(() => {
    log.trace('Execute raw migration')
    return knex.raw(UPDATE_QUERY)
  })
  .then(() => {
    log.trace('Add `creator` field')
    // If there is an org with out any users, this will fail
    return knex.schema.table('organizations', function addField (table) {
      table.foreign('creator')
        .references('users.id')
    })
  })
  debug(modifyTable.toString())
  return modifyTable
}

exports.down = function (knex, Promise) {
  var modifyTable = knex.schema.table('organizations', function (table) {
    table.dropColumn('creator')
  })
  debug(modifyTable.toString())
  return modifyTable
}
