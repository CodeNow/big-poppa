'use strict'
const BaseError = require('error-cat/errors/base-error')

/**
 * Base class for all database related errors
 * @module big-poppa:database-error
 */
module.exports = class DatabaseError extends BaseError {
  /**
   * Constructs the database error given a vanilla knex error or an error message.
   *
   * @param {Error|String}  errorOrMessage         - Error or error message describing error
   * @param {String}        errorOrMessage.message - Error message describing error
   * @param {Object}        data                   - Object with any other data that needs to get reported
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
