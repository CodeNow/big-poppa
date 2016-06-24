'use strict'

/**
 * Base Error class for Cream. All custom errors should extend from this as it
 * handles the setup for the name, message, and stack trace.
 * @module cream:common:errors
 */
module.exports = class CreamError extends Error {
  constructor (message) {
    super()
    this.message = message
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor.name)
  }
}
