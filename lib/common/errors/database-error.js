'use strict'

var BaseError = require('./base-error')
var defaults = require('101/defaults')
var exists = require('101/exists')

/**
 * Base class for all database related errors
 * @module big-poppa:common:database-error
 */
module.exports = class DatabaseError extends BaseError {
  /**
   * Constructs the database error given a vanilla knex error.
   * @param {Error} knexError The original knex error.
   */
  constructor (knexError) {
    super('Database Error')
    this._setPropertiesFromKnexError(knexError)
  }

  /**
   * Sets properties for this error given a knex error.
   * @param {Error} knexError The original knex error.
   */
  _setPropertiesFromKnexError (knexError) {
    if (exists(knexError)) {
      defaults(this, knexError)
      this.message = knexError.message || knexError.detail || this.message
    }
  }
}
