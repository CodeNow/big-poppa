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
  .then(function () {
    // Add subscription IDs to all organizations
    return knex.select('*').from(TABLE_NAME)
        .innerJoin('users', `${TABLE_NAME}.creator`, 'user.id')
  })
  .then(function (organizations) {
    return Promise.all(organizations.map(function (org) {
      return stripe.customers.retrieve(org.stripe_customer_id)
      .then(function (stripeCustomer) {
        var subscriptions = stripeCustomer.subscriptions.data
        if (subscriptions.length > 1) {
          throw new Error('Ambigious amount of subscriptions for customer (more than 1)')
        }
        let updates = {}
        updates[NEW_PROPERTY] = subscriptions[0].id
        log.trace({ updates, org }, 'Updating organization')
        return knex(TABLE_NAME)
        .where('id', org.id)
        .update(updates)
      })
    }))
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
