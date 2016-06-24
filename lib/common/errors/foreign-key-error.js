'use strict'

var DatabaseError = require('./database-error')

/**
 * Error thrown when a foreign key constraint is violated during a database
 * insert.
 * @module astral:commmon:errors
 */
module.exports = class ForeignKeyError extends DatabaseError {}
