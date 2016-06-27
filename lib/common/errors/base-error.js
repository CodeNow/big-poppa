'use strict'

/**
 * Base Error class for Big Poppa. All custom errors should extend from this as it
 * handles the setup for the name, message, and stack trace.
 * @module big-poppa:common:errors
 */
module.exports = class BaseError extends Error {
  constructor (message) {
    super()
    this.message = message
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor.name)
  }
}
