'use strict'
const GithubEntityError = require('./github-entity-error')

/**
 * Error thrown when a Github entity exists, but its type does not match the
 * required type (expecting an organization, but got a user)
 * @module big-poppa:commmon:errors
 */
module.exports = class GithubEntityTypeError extends GithubEntityError {

  constructor (err, data) {
    super('Github Entity Type Error:', err.message, data)
  }

}
