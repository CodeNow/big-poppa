'use strict'
const DatabaseError = require('./database-error')

/**
 * Error thrown when a uniqueness constraint is violated during a database
 * insert.
 * @module big-poppa:common:errors
 */
module.exports = class UniqueError extends DatabaseError {}
