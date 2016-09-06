'use strict'

var debug = require('debug')('big-poppa:migration')

exports.up = function (knex, Promise) {
  var modifyTable = knex.schema.table('organizations', function (table) {
    table.boolean('runnabot_enabled')
      .defaultTo(false)
      .notNullable()
  })
  debug(modifyTable.toString())
  return modifyTable
}

exports.down = function (knex, Promise) {
  var modifyTable = knex.schema.table('organizations', function (table) {
    table.dropColumn('runnabot_enabled')
  })
  debug(modifyTable.toString())
  return modifyTable
}
