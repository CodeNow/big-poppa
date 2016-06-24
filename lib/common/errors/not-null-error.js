'use strict'

var DatabaseError = require('./database-error')

/**
 * Error thrown when a not-null constraint is violated during a database insert.
 * @module astral:commmon:errors
 */
module.exports = class NotNullError extends DatabaseError {}
