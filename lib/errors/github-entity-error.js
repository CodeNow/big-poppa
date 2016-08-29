'use strict'

var GithubError = require('./github-error')

/**
 * Error thrown when a there's an error with a Github entity (user, organization)
 * @module big-poppa:errors
 */
module.exports = class GithubEntityError extends GithubError {}
