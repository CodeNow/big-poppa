'use strict'

const CriticalError = require('error-cat/errors/critical-error')
require('loadenv')()

/**
 * Database connection via knex query builder.
 * @module big-poppa:database
 */

if (!process.env.POSTGRES_CONNECT_STRING) {
  if (
      process.env.POSTGRES_HOST &&
      process.env.POSTGRES_USER &&
      process.env.POSTGRES_DB
  ) {
    let host = process.env.POSTGRES_HOST
    let user = process.env.POSTGRES_USER
    let db = process.env.POSTGRES_DB
    process.env.POSTGRES_CONNECT_STRING = `postgres://${user}@${host}/${db}`
  } else {
    throw new CriticalError('No POSTGRES_CONNECT_STRING provided')
  }
}

module.exports = require('knex')({
  client: 'pg',
  connection: process.env.POSTGRES_CONNECT_STRING,
  pool: {
    min: process.env.POSTGRES_POOL_MIN,
    max: process.env.POSTGRES_POOL_MAX
  }
})
