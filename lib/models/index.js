'use strict'

/**
 * Database connection via knex query builder.
 * @module big-poppa:models:user
 */

const db = require('database')
const bookshelf = require('bookshelf')(db)
// NOTE: Prevents circular dependencies
bookshelf.plugin('registry')

module.exports = {
  bookshelf: bookshelf
}
