'use strict'
const DatabaseError = require('./database-error')

/**
 * Error thrown when a no rows in the database are found given an `select` type query.
 * @module big-poppa:errors
 */
module.exports = class NotFoundError extends DatabaseError {
  constructor (err, data) {
    super(err, data, { level: 'trace' })
  }
}
