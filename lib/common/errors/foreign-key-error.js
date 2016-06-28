'use strict'
const DatabaseError = require('./database-error')

/**
 * Error thrown when a foreign key constraint is violated during a database
 * insert.
 * @module big-poppa:commmon:errors
 */
module.exports = class ForeignKeyError extends DatabaseError {}
