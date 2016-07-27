'use strict'

var debug = require('debug')('big-poppa:migration')

exports.up = function (knex, Promise) {
  var modifyTable = knex.schema.table('organization', function (table) {
    table.boolean('first_dock_created').defaultTo(false)
  })
  debug(modifyTable.toString())
  return modifyTable
}

exports.down = function (knex, Promise) {
  var modifyTable = knex.schema.table('organization', function (table) {
    table.dropColumn('first_dock_created')
  })
  debug(modifyTable.toString())
  return modifyTable
}
