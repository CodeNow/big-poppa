'use strict'

var debug = require('debug')('big-poppa:migration')

/**
 * Creates the `users` table.
 */

exports.up = function (knex, Promise) {
  var createTable = knex.schema.createTable('organization', function (table) {
    table.increments('id')
      .primary()
    table.integer('github_id')
      .unique()
    table.timestamps(true) // Adds default `created_at` `updated_at` timestamps
    table.string('stripe_customer_id')
      .unique()
    table.timestamp('trial_end')
      .notNullable()
    table.timestamp('active_period_end')
      .notNullable()
    table.timestamp('grace_period_end')
      .notNullable()
  })
  debug(createTable.toString())
  return createTable
}

exports.down = function (knex, Promise) {
  var dropTable = knex.schema.dropTable('organization')
  debug(dropTable.toString())
  return dropTable
}
