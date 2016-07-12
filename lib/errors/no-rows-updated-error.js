'use strict'
const DatabaseError = require('./database-error')

/**
 * Error thrown when no rows are updated on a update operation
 * @module big-poppa:errors
 */
module.exports = class NoRowsUpdatedError extends DatabaseError {}
