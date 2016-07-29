'use strict'

const ApiClient = require('simple-api-client')
const Promise = require('bluebird')

Promise.promisifyAll(ApiClient)
Promise.promisifyAll(ApiClient.prototype)

module.exports = class BigPoppaClient extends ApiClient {
  /**
   * API Client for Optimus. Sets the default host to `process.env.OPTIMUS_HOST`.
   * @param {string} [host] Overrides the default host for the client.
   * @param {Number} [port] Overrides the default port for the client.
   */
  constructor () {
    super(process.env.BIG_POPPA_URL)
  }

  getOrganization (orgId) {
    if (!orgId) {
      return Promise.reject(new Error('missing orgId'))
    }
    var path = '/organization/' + encodeURIComponent(orgId)
    return this.getAsync({
      path: path,
      json: true
    })
  }

  getOrganizations (opts) {
    var path = '/organization/'
    if (opts.githubId) {
      path += '?githubId=' + encodeURIComponent(opts.githubId)
    }
    return this.getAsync({
      path: path,
      json: true
    })
  }

  updateOrganization (orgId, updates) {
    if (!orgId) {
      return Promise.reject(new Error('missing orgId'))
    }
    var path = '/organization/' + encodeURIComponent(orgId)
    return this.patchAsync({
      body: updates,
      path: path,
      json: true
    })
  }

  getUser (userId) {
    if (!userId) {
      return Promise.reject(new Error('missing userId'))
    }
    var path = '/user/' + encodeURIComponent(userId)
    return this.getAsync({
      path: path,
      json: true
    })
  }

  getUsers (opts) {
    var path = '/user/'
    if (opts.githubId) {
      path += '?githubId=' + encodeURIComponent(opts.githubId)
    }
    return this.getAsync({
      path: path,
      json: true
    })
  }
}
