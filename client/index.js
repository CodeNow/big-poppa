'use strict'

const ApiClient = require('simple-api-client')
const Bluebird = require('bluebird')

Bluebird.promisifyAll(ApiClient)
Bluebird.promisifyAll(ApiClient.prototype)

module.exports = class BigPoppaClient extends ApiClient {
  /**
   * API Client for Optimus. Sets the default host to `process.env.OPTIMUS_HOST`.
   * @param {string} [host] Overrides the default host for the client.
   * @param {Number} [port] Overrides the default port for the client.
   */
  constructor () {
    super(process.env.BIG_POPPA_URL)
  }

  getOrganization (opts) {
    var path = '/organization/'
    if (opts.githubId) {
      path += '?githubId=' + encodeURIComponent(opts.githubId)
    } else if (opts.orgId) {
      path += encodeURIComponent(opts.orgId)
    }
    return this.getAsync({
      path: path,
      json: true
    })
  }

  updateOrganization (opts, updates) {
    var path = '/organization/'
    if (opts.githubId) {
      path += '?githubId=' + encodeURIComponent(opts.githubId)
    } else if (opts.orgId) {
      path += encodeURIComponent(opts.orgId)
    }
    return this.patchAsync({
      body: updates,
      path: path,
      json: true
    })
  }

  getUser (opts) {
    var path = '/user/'
    if (opts.githubId) {
      path += '?githubId=' + encodeURIComponent(opts.githubId)
    } else if (opts.userId) {
      path += encodeURIComponent(opts.userId)
    }
    return this.getAsync({
      path: path,
      json: true
    })
  }

  updateUser (opts, updates) {
    var path = '/user/'
    if (opts.githubId) {
      path += '?githubId=' + encodeURIComponent(opts.githubId)
    } else if (opts.userId) {
      path += encodeURIComponent(opts.userId)
    }
    return this.patchAsync({
      body: updates,
      path: path,
      json: true
    })
  }
}