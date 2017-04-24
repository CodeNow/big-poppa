'use strict'

require('loadenv')()
const log = require('../lib/util/logger').child({ module: 'migrations/add_private_registry' })

const TABLE_NAME = 'organizations'
const NEW_PROPERTY = 'private_registry_url'

exports.up = function (knex, Promise) {
  var modifyTable = knex.schema.table(TABLE_NAME, function addField (table) {
    log.trace(`Add '${NEW_PROPERTY}' field`)
    table.string(NEW_PROPERTY)
  })
  log.trace(modifyTable.toString())
  return modifyTable
}

exports.down = function (knex, Promise) {
  var modifyTable = knex.schema.table(TABLE_NAME, function (table) {
    table.dropColumn(NEW_PROPERTY)
  })
  log.trace(modifyTable.toString())
  return modifyTable
}
