'use strict'
const BaseError = require('error-cat/errors/base-error')

/**
 * Base class for all github related errors.
 * @module big-poppa:common:github-error
 */
module.exports = class GithubError extends BaseError {
  /**
   * Constructs a GithubError. This is the base error related to anything
   * related to the github API.
   *
   * @param {String}  message - Error message describing error
   * @param {Object}  data    - Object with any other data that needs to get reported
   */
  constructor (message, data) {
    super('Github Error: ' + message, data)
  }
}
