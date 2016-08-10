'use strict'

var debug = require('debug')('big-poppa:migration')

const tableName = 'organizations'
const triggerName = 'update_lower_name'
const lowerNameEndColumnName = 'lower_name'
const nameEndColumnName = 'name'

const ADD_LOWERCASE_TRIGGER = `
  CREATE OR REPLACE FUNCTION ${triggerName}()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.${lowerNameEndColumnName} = LOWER(NEW.${nameEndColumnName});
    RETURN NEW;
  END;
  $$ language 'plpgsql';
`
const CREATE_TRIGGER = `
  CREATE TRIGGER ${triggerName} BEFORE INSERT OR UPDATE
    ON ${tableName} FOR EACH ROW EXECUTE PROCEDURE
    ${triggerName}();
`

const DELETE_TRIGGER = `
  DROP TRIGGER ${triggerName} ON ${tableName};
`

exports.up = function (knex, Promise) {
  var modifyTable = Promise.resolve()
    .then(function () {
      return knex.schema
        .raw(ADD_LOWERCASE_TRIGGER)
        .raw(CREATE_TRIGGER)
    })
  debug(modifyTable.toString())
  return modifyTable
}

exports.down = function (knex, Promise) {
  var modifyTable = Promise.resolve()
    .then(function () {
      return knex.schema
        .raw(DELETE_TRIGGER)
    })
  debug(modifyTable.toString())
  return modifyTable
}
