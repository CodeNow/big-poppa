'use strict'

var debug = require('debug')('big-poppa:migration')

exports.up = function (knex, Promise) {
  var modifyTable = knex.schema.table('organizations', function (table) {
    table.string('name')
    table.string('lower_name')
  })
  debug(modifyTable.toString())
  return modifyTable
}

exports.down = function (knex, Promise) {
  var modifyTable = knex.schema.table('organizations', function (table) {
    table.dropColumn('name')
    table.dropColumn('lower_name')
  })
  debug(modifyTable.toString())
  return modifyTable
}
