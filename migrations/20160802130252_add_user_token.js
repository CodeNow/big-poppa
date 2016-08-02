'use strict'

var debug = require('debug')('big-poppa:migration')

/**
 * Adds the token field to the `users` table.
 */

exports.up = function (knex, Promise) {
  var modifyTable = knex.schema.table('users', function (table) {
    table.string('access_token')
  })
  debug(modifyTable.toString())
  return modifyTable
}

exports.down = function (knex, Promise) {
  var modifyTable = knex.schema.table('users', function (table) {
    table.dropColumn('access_token')
  })
  debug(modifyTable.toString())
  return modifyTable
}
