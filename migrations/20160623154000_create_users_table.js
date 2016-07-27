'use strict'

var debug = require('debug')('big-poppa:migration')

/**
 * Creates the `users` table.
 */
const CREATE_TABLE_QUERY = `
      CREATE VIEW active_users AS
      SELECT * FROM users WHERE is_active IS true;
    `
const SOFT_TRIGGER_CREATION_QUERY = `
      CREATE FUNCTION soft_delete()
        RETURNS trigger AS $$
          DECLARE
            command text := ' SET is_active = false WHERE id = $1';
          BEGIN
            EXECUTE 'UPDATE ' || TG_TABLE_NAME || command USING OLD.id;
            RETURN NULL;
          END;
        $$ LANGUAGE plpgsql;
    `
const TRIGGER_ATTACH_QUERY = `
      CREATE TRIGGER soft_delete_user
      INSTEAD OF DELETE ON active_users
      FOR EACH ROW EXECUTE PROCEDURE soft_delete();
    `
exports.up = function (knex, Promise) {
  var createTable = knex.schema
    .createTable('users', function (table) {
      table.increments('id')
        .primary()
      table.integer('github_id')
        .unique()
      table.timestamps(true) // Adds default `created_at` `updated_at` timestamps
      table.boolean('is_active').defaultTo(true)
    })
    .raw(CREATE_TABLE_QUERY)
    .raw(SOFT_TRIGGER_CREATION_QUERY)
    .raw(TRIGGER_ATTACH_QUERY)
  debug(createTable.toString())
  return createTable
}

exports.down = function (knex, Promise) {
  var dropTable = knex.schema.dropTable('users')
  debug(dropTable.toString())
  return dropTable
}
