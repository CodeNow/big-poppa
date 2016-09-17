'use strict'

let debug = require('debug')('big-poppa:migration')

exports.up = function (knex, Promise) {
  var modifyTable = knex.schema.table('organizations', function (table) {
    table.integer('creator')
      .references('users.id')
      .notNullable()
  })
  debug(modifyTable.toString())
  return modifyTable
}

exports.down = function (knex, Promise) {
  var modifyTable = knex.schema.table('organizations', function (table) {
    table.dropColumn('creator')
  })
  debug(modifyTable.toString())
  return modifyTable
}
