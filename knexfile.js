'use strict'

require('loadenv')() // Required for migrations
console.log(process.env)

// Update with your config settings.

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
  }
}

module.exports = {

  development: {
    client: 'pg',
    connection: process.env.POSTGRES_CONNECT_STRING,
    migrations: {
      tableName: 'migrations'
    }
  },

  test: {
    client: 'pg',
    connection: process.env.POSTGRES_CONNECT_STRING,
    migrations: {
      tableName: 'migrations'
    }
  }

}
