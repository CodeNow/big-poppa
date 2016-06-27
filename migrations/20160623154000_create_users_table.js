'use strict'

var debug = require('debug')('big-poppa:migration')

/**
 * Creates the `users` table.
 */

exports.up = function (knex, Promise) {
  var createTable = knex.schema.createTable('user', function (table) {
    table.integer('github_id')
      .primary()
    table.timestamps(true) // Adds default `created_at` `updated_at` timestamps
  })
  debug(createTable.toString())
  return createTable
}

exports.down = function (knex, Promise) {
  var dropTable = knex.schema.dropTable('user')
  debug(dropTable.toString())
  return dropTable
}
