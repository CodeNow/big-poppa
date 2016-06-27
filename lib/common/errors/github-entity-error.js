'use strict'

var GithubError = require('./github-error')

/**
 * Error thrown when a Github entity doesn't exist
 * @module astral:commmon:errors
 */
module.exports = class GithubEntityError extends GithubError {}