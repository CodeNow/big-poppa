'use strict'
const BaseError = require('error-cat/errors/base-error')

/**
 * Base class for all github related errors.
 * @module big-poppa:common:github-error
 */
module.exports = class GithubError extends BaseError {
  /**
   * Constructs the database error given a vanilla github error.
   * @param {Error} githubError The original github error.
   */
  constructor (message, data) {
    super('Github Error: ' + message, data)
  }
}
