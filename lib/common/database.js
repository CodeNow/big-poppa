'use strict'

/**
 * Database connection via knex query builder.
 * @module big-poppa:database
 */
module.exports = require('knex')({
  client: 'pg',
  connection: process.env.POSTGRES_CONNECT_STRING,
  pool: {
    min: process.env.POSTGRES_POOL_MIN,
    max: process.env.POSTGRES_POOL_MAX
  }
})
