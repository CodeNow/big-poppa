'use strict'

let debug = require('debug')('big-poppa:migration')

const orgUsersTableName = 'organizations_users'
const orgTableName = 'organizations'
const usersTableName = 'users'

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
  ) org
  WHERE ${orgTableName}.id = org.id;
`

exports.up = function (knex, Promise) {
  var modifyTable = knex.schema.table('organizations', function addField (table) {
    // Currently nullable, but will later be not-nullable after we migrate
    // all organizations
    table.integer('creator')
      .notNullable()
      .defaultTo(0)
  })
  .then(() => knex.schema.raw(UPDATE_QUERY))
  .then(() => {
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
