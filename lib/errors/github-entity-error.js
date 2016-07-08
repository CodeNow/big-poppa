'use strict'

var GithubError = require('./github-error')

/**
 * Error thrown when a there's an error with a Github entity (user, organization)
 * @module big-poppa:errors
 */
module.exports = class GithubEntityError extends GithubError {

  /**
   * Constructs a github error given an error received from the GH API.
   *
   * @param {Error}   errorOrMessage         - Error returned by the GH API
   * @param {String}  errorOrMessage.message - Error message describing error
   * @param {Object}  data                   - Object with any other data that needs to get reported
   */
  constructor (err, data) {
    super('Github Entity Error:', err.message, data)
  }

}
