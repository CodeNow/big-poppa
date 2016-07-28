'use strict'

var debug = require('debug')('big-poppa:migration')

/**
 * Creates the `users` table.
 */

exports.up = function (knex, Promise) {
  var createTable = knex.schema.createTable('organizations', function (table) {
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
    table.boolean('is_active').defaultTo(true)
  })
  .raw(CREATE_TABLE_QUERY)
  .raw(ATTACH_TRIGGER_QUERY)
  debug(createTable.toString())
  return createTable
}

exports.down = function (knex, Promise) {
  var dropTable = knex.schema.dropTable('organizations')
  debug(dropTable.toString())
  return dropTable
}
