'use strict'

var debug = require('debug')('big-poppa:migration')

exports.up = function (knex, Promise) {
  var modifyTable = knex.schema.table('organizations', function (table) {
    table.boolean('has_payment_method')
      .defaultTo(false)
      .notNullable()
  })
  debug(modifyTable.toString())
  return modifyTable
}

exports.down = function (knex, Promise) {
  var modifyTable = knex.schema.table('organizations', function (table) {
    table.dropColumn('has_payment_method')
  })
  debug(modifyTable.toString())
  return modifyTable
}
