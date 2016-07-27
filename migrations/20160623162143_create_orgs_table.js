'use strict'

var debug = require('debug')('big-poppa:migration')

/**
 * Creates the `users` table.
 */
const CREATE_TABLE_QUERY = `
    CREATE VIEW active_organizations AS
    SELECT * FROM organizations WHERE is_active IS true;
  `
const ATTACH_TRIGGER_QUERY = `
    CREATE TRIGGER soft_delete_organization
    INSTEAD OF DELETE ON active_organizations
    FOR EACH ROW EXECUTE PROCEDURE soft_delete();
  `
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
