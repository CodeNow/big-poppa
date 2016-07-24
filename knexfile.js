require('loadenv')() // Required for migrations

// Update with your config settings.

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
  },

  'production-gamma': {
    client: 'pg',
    connection: process.env.POSTGRES_CONNECT_STRING,
    migrations: {
      tableName: 'migrations'
    }
  },

  'production-epsilon': {
    client: 'pg',
    connection: process.env.POSTGRES_CONNECT_STRING,
    migrations: {
      tableName: 'migrations'
    }
  },

  'production-delta': {
    client: 'pg',
    connection: process.env.POSTGRES_CONNECT_STRING,
    migrations: {
      tableName: 'migrations'
    }
  }

}
