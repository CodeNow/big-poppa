'use strict'

var debug = require('debug')('big-poppa:migration')

/**
 * Adds the token field to the `users` table.
 */

exports.up = function (knex, Promise) {
  var modifyTable = knex.schema.table('organizations', function (table) {
    table.string('name')
  })
  debug(modifyTable.toString())
  return modifyTable
}

exports.down = function (knex, Promise) {
  var modifyTable = knex.schema.table('organizations', function (table) {
    table.dropColumn('name')
  })
  debug(modifyTable.toString())
  return modifyTable
}
