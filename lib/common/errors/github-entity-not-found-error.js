'use strict'

var GithubEntityError = require('./github-entity-error')

/**
 * Error thrown when a Github entity doesn't exist
 * @module big-poppa:commmon:errors
 */
module.exports = class GithubEntityNotFoundError extends GithubEntityError {

  constructor (err, data) {
    super('Github Entity Not Found Error:', err.message, data)
  }

}