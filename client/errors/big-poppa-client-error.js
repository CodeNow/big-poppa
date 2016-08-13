'use strict'

const BaseError = require('error-cat/errors/base-error')

/**
 * Error thrown when a there's an error with a Github entity (user, organization)
 * @module big-poppa:errors
 */
module.exports = class BigPoppaClientError extends BaseError {

  /**
   * Constructs a bigPoppaClient error
   *
   * @param {String}  errorTitle - Error Title
   * @param {String}  errMessage - Error message describing error
   * @param {Object}  data       - Object with any other data that needs to get reported
   */
  constructor (errorTitle, errMessage, data) {
    super('BigPoppaClient Error: ' + errorTitle + ' : ' + errMessage, data)
  }

}
