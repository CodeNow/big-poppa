'use strict'
const GithubEntityError = require('./github-entity-error')

/**
 * Error thrown when a Github entity exists, but its type does not match the
 * required type (expecting an organization, but got a user)
 * @module big-poppa:errors
 */
module.exports = class GithubEntityTypeError extends GithubEntityError {}
