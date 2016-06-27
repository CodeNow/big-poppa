'use strict'

let debug = require('debug')('big-poppa:migration')

/**
 * Creates the `organization_user` table.
 */
exports.up = function (knex, Promise) {
  let createTable = knex.schema.createTable('organization_user', function (table) {
    table.integer('organization_github_id')
      .references('organization.github_id')
    table.integer('user_github_id')
      .references('user.github_id')
    table.unique(['organization_github_id', 'user_github_id'])
  })
  debug(createTable.toString())
  return createTable
}

exports.down = function (knex, Promise) {
  let dropTable = knex.schema.dropTable('organization_user')
  debug(dropTable.toString())
  return dropTable
}
