'use strict'

var isString = require('101/is-string')
var DatabaseError = require('./errors/database-error')
var NotNullError = require('./errors/not-null-error')
var ForeignKeyError = require('./errors/foreign-key-error')
var UniqueError = require('./errors/unique-error')

/**
 * Utility methods for postgresql models in big-poppa.
 * @module big-poppa:common:models
 */
module.exports = class Util {
  /**
   * Execption handler that casts specific error codes returned by postgres to
   * the appropriate error class and then rethrow. This should be added as a
   * `catch` handler for all queries performed using knex.
   *
   * @example
   * var db = require('lib/common/database')
   * var Model = require('lib/common/models/util')
   * db('github_events').insert({ ... })
   *   // Will rethrow with specific error classes to make it easier to handle
   *   // specific error cases in workers...
   *   .catch(Model.castDatabaseError)
   *   // For instance you can now specifically catch uniqueness errors
   *   .catch(UniqueViolationError, function (err){ ... })
   *
   * @param {err} The error to cast and re-throw
   * @throws The error casted to a specific type (if applicable) or a general
   *   `DatabaseError` if not deemed specifically needed. If the error is not
   *   a database error then this method simply rethrows the original error.
   */
  static castDatabaseError (err) {
    // SQLSTATE error codes are defined as strings of length 5, if this is not
    // the case we cannot determine a specific database error to handle and
    // should simply rethrow the error.
    //
    // see: http://www.contrib.andrew.cmu.edu/~shadow/sql/sql1992.txt
    if (!isString(err.code) || err.code.length !== 5) {
      throw err
    }

    switch (err.code) {
      case '23502':
        throw (new NotNullError(err))
      case '23503':
        throw (new ForeignKeyError(err))
      case '23505':
        throw (new UniqueError(err))
    }

    throw (new DatabaseError(err))
  }
}
