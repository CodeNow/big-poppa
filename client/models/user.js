'use strict'

const ApiClient = require('simple-api-client')

module.exports = class User extends ApiClient {
  /**
   * API Client for Optimus. Sets the default host to `process.env.OPTIMUS_HOST`.
   * @param {string} [host] Overrides the default host for the client.
   * @param {Number} [port] Overrides the default port for the client.
   */
  constructor () {
    super(process.env.BIG_POPPA_URL)
  }

  get (opts) {
    var path = '/user/'
    if (opts.githubId) {
      path += '?githubId=' + encodeURIComponent(opts.githubId)
    } else if (opts.userId) {
      path += encodeURIComponent(opts.userId)
    }
    return this.get({
      path: path,
      json: true
    })
  }

  update (opts, updates) {
    var path = '/user/'
    if (opts.githubId) {
      path += '?githubId=' + encodeURIComponent(opts.githubId)
    } else if (opts.userId) {
      path += encodeURIComponent(opts.userId)
    }
    return this.patch({
      body: updates,
      path: path,
      json: true
    })
  }
}