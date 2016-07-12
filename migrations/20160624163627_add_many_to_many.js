'use strict'

let debug = require('debug')('big-poppa:migration')

/**
 * Creates the `organization_user` table.
 */
exports.up = function (knex, Promise) {
  let createTable = knex.schema.createTable('organizations_users', function (table) {
    table.integer('organization_id')
      .references('organizations_with_deleted.id')
    table.integer('user_id')
      .references('users_with_deleted.id')
    table.unique(['organization_id', 'user_id'])
  })
  debug(createTable.toString())
  return createTable
}

exports.down = function (knex, Promise) {
  let dropTable = knex.schema.dropTable('organizations_users')
  debug(dropTable.toString())
  return dropTable
}
