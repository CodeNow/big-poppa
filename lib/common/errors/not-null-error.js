'use strict'

const DatabaseError = require('./database-error')

/**
 * Error thrown when a not-null constraint is violated during a database insert.
 * @module big-poppa:commmon:errors
 */
module.exports = class NotNullError extends DatabaseError {}
