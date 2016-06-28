'use strict'
const BaseError = require('error-cat/errors/base-error')

/**
 * Base class for all database related errors
 * @module big-poppa:common:database-error
 */
module.exports = class DatabaseError extends BaseError {
  /**
   * Constructs the database error given a vanilla knex error.
   * @param {Error} knexError The original knex error.
   */
  constructor (knexError, data) {
    super('Database Error:', knexError.message, data)
  }
}
