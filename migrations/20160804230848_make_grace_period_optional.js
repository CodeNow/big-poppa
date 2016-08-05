'use strict'

var debug = require('debug')('big-poppa:migration')

/**
 * Make the `gracePeriodEnd` value nullable
 */

exports.up = function (knex, Promise) {
  var modifyTable = Promise.resolve()
    .then(function () {
      return knex.schema.table('organizations', function (table) {
        table.dropColumn('grace_period_end')
      })
    })
    .then(function () {
      return knex.schema.table('organizations', function (table) {
        table.timestamp('grace_period_end')
          .nullable()
      })
    })
  debug(modifyTable.toString())
  return modifyTable
}

exports.down = function (knex, Promise) {
  var modifyTable = Promise.resolve()
    .then(function () {
      return knex.schema.table('organizations', function (table) {
        table.dropColumn('grace_period_end')
      })
    })
    .then(function () {
      return knex.schema.table('organizations', function (table) {
        table.timestamp('grace_period_end')
          .notNullable()
      })
    })
  debug(modifyTable.toString())
  return modifyTable
}
