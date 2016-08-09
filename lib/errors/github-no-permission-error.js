'use strict'

var GithubEntityError = require('./github-entity-error')

/**
 * Error thrown when a Github entity doesn't exist
 * @module big-poppa:errors
 */
module.exports = class GithubEntityNoPermissionError extends GithubEntityError {}
