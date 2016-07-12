'use strict'

var debug = require('debug')('big-poppa:migration')

/**
 * Creates the `users` table.
 */

exports.up = function (knex, Promise) {
  var createTable = knex.schema
    .createTable('users_with_deleted', function (table) {
      table.increments('id')
        .primary()
      table.integer('github_id')
        .unique()
      table.timestamps(true) // Adds default `created_at` `updated_at` timestamps
      table.timestamp('deleted_at')
    })
    .raw(`
      CREATE VIEW users AS
      SELECT * FROM users_with_deleted WHERE deleted_at IS NULL;
    `)
    .raw(`
      CREATE FUNCTION soft_delete()
        RETURNS trigger AS $$
          DECLARE
            command text := ' SET deleted_at = current_timestamp WHERE id = $1';
          BEGIN
            EXECUTE 'UPDATE ' || TG_TABLE_NAME || command USING OLD.id;
            RETURN NULL;
          END;
        $$ LANGUAGE plpgsql;
    `)
    .raw(`
      CREATE TRIGGER soft_delete_user
      INSTEAD OF DELETE ON users
      FOR EACH ROW EXECUTE PROCEDURE soft_delete();
    `)
  debug(createTable.toString())
  return createTable
}

exports.down = function (knex, Promise) {
  var dropTable = knex.schema.dropTable('users_with_deleted')
  debug(dropTable.toString())
  return dropTable
}
