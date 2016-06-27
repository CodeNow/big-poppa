'use strict'

var CreamError = require('./cream-error')
var defaults = require('101/defaults')
var exists = require('101/exists')

/**
 * Base class for all github related errors in Astral.
 * @module cream:common:github-error
 */
module.exports = class GithubError extends CreamError {
  /**
   * Constructs the database error given a vanilla github error.
   * @param {Error} githubError The original github error.
   */
  constructor (githubError) {
    super('Github Error')
    this._setPropertiesFromError(githubError)
  }

  /**
   * Sets properties for this error given a github error.
   * @param {Error} githubError The original github error.
   */
  _setPropertiesFromError (githubError) {
    if (exists(githubError)) {
      defaults(this, githubError)
      this.message = githubError.message || githubError.detail || this.message
    }
  }
}
