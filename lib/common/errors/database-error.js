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
  constructor (errorOrMessage, data) {
    if (errorOrMessage instanceof Error) {
      super(
        'Database Error: ' + errorOrMessage.message,
        Object.assign(data || {}, { err: errorOrMessage })
      )
    } else {
      super('Database Error: ' + errorOrMessage, data)
    }
  }
}
