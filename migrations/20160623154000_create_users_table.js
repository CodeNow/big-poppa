'use strict'

var debug = require('debug')('cream:migration')

/**
 * Creates the `users` table.
 */

exports.up = function (knex, Promise) {
  var createTable = knex.schema.createTable('users', function (table) {
    table.integer('github_id')
      .primary()
    table.timestamps(true) // Adds default `created_at` `updated_at` timestamps
  })
  debug(createTable.toString())
  return createTable
}

exports.down = function (knex, Promise) {
  var dropTable = knex.schema.dropTable('users')
  debug(dropTable.toString())
  return dropTable
}
