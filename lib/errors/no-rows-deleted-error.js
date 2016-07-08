'use strict'
const DatabaseError = require('./database-error')

/**
 * Error thrown when no rows are deleted on a delete operation
 * @module big-poppa:commmon:errors
 */
module.exports = class NoRowsDeletedError extends DatabaseError {}
