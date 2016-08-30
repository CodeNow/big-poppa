'use strict'

var debug = require('debug')('big-poppa:migration')

exports.up = function(knex, Promise) {
  var modifyTable = knex.schema.table('organizations', function (table) {
    table.jsonb('metadata')
  })
  debug(modifyTable.toString())
  return modifyTable
};

exports.down = function(knex, Promise) {
  var modifyTable = knex.schema.table('organizations', function (table) {
    table.dropColumn('metadata')
  })
  debug(modifyTable.toString())
  return modifyTable
};
