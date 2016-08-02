'use strict'

var debug = require('debug')('big-poppa:migration')

/**
 * Creates the `users` table.
 */

exports.up = function (knex, Promise) {
  var createTable = knex.schema
    .createTable('users', function (table) {
      table.increments('id')
        .primary()
      table.integer('github_id')
        .unique()
      table.string('access_token')
      table.timestamps(true) // Adds default `created_at` `updated_at` timestamps
      table.boolean('is_active').defaultTo(true)
    })
  debug(createTable.toString())
  return createTable
}

exports.down = function (knex, Promise) {
  var dropTable = knex.schema.dropTable('users')
  debug(dropTable.toString())
  return dropTable
}
