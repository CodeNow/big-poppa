'use strict'

require('loadenv')()
const stripe = require('stripe')(process.env.STRIPE_API_KEY)
const log = require('../lib/util/logger').child({ module: 'migrations/add_stripe_subscription_field' })

const TABLE_NAME = 'organizations'
const NEW_PROPERTY = 'stripe_subscription_id'

exports.up = function (knex, Promise) {
  var modifyTable = knex.schema.table(TABLE_NAME, function addField (table) {
    log.trace('Add `stripe_subscription_id` field')
    table.string(NEW_PROPERTY)
  })
  .then(function () {
    // Add subscription IDs to all organizations
    return knex.select('*').from(TABLE_NAME).whereNotNull('stripe_customer_id')
  })
  .then(function (organizations) {
    console.log(organizations.length)
    return Promise.all(organizations.map(function (org) {
      console.log('1')
      return stripe.customer.retrieve(org.stripe_customer_id)
      .then(function (stripeCustomer) {
        console.log(stripeCustomer)
        // return knex(TABLE_NAME)
        // .where('id', org.id)
        // .update({
          // stripe_subscription_id:
        // })
      })
    }))
  })
  .then(function () {
    throw new Error('!! ROLLBACK !!')
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
