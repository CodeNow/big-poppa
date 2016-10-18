'use strict'

require('loadenv')()
const log = require('../lib/util/logger').child({ module: 'migrations/add_stripe_subscription_field' })

const TABLE_NAME = 'organizations'
const NEW_PROPERTY = 'stripe_subscription_id'

exports.up = function (knex, Promise) {
  var modifyTable = knex.schema.table(TABLE_NAME, function addField (table) {
    log.trace('Add `stripe_subscription_id` field')
    table.string(NEW_PROPERTY).unique()
  })
  log.trace(modifyTable.toString())
  return modifyTable
}

exports.down = function (knex, Promise) {
  var modifyTable = knex.schema.table('organizations', function (table) {
    table.dropColumn(NEW_PROPERTY)
  })
  log.trace(modifyTable.toString())
  return modifyTable
}
