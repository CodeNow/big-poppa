'use strict'

const ApiClient = require('simple-api-client')
const Promise = require('bluebird')
const isObject = require('101/is-object')
const BigPoppaClientError = require('./errors/big-poppa-client-error')

Promise.promisifyAll(ApiClient)
Promise.promisifyAll(ApiClient.prototype)

module.exports = class BigPoppaClient extends ApiClient {

  /**
   * Get an opts object to pass to request
   *
   * @param {String}   path - URL path
   * @param {Object}   body - Object with updates to send in the request
   * @returns {Object}
   */
  static getOpts (path, body) {
    return {
      json: true,
      path,
      body
    }
  }

  /**
   * Parse opts object into a query string
   *
   * @param {Object}   opts - Query options to add to the URL
   * @returns {String}
   */
  static parseOpts (opts) {
    return '?' + Object.keys(opts)
    .map(key => {
      let value = opts[key]
      let transformedValue = value
      if (isObject(value)) { // Handle sub queries
        transformedValue = JSON.stringify(value)
      }
      return key + '=' + encodeURIComponent(transformedValue)
    })
    .join('&')
  }

  /**
   * Throw an error if the request is a 400 >= request
   *
   * @param {Object}   res - Response object
   * @throws {Error}   BigPoppaClientError
   * @return {Object}
   */
  static checkResponseForError (res) {
    if (res.statusCode >= 400) {
      throw new BigPoppaClientError(res.body.err, res.body.message, {
        orignalError: res.body
      })
    }
    return res
  }

  /**
   * Check if response is a 400 response and return the body
   *
   * @param {Object}   res - Response object
   * @throws {Error}   BigPoppaClientError
   * @returns {Object}
   */
  static responseHandler (res) {
    return Promise.try(BigPoppaClient.checkResponseForError.bind(null, res))
      .get('body')
  }

  /**
   * Check if response is a 400 response and return the body and updates
   *
   * @param {Object}   res - Response object
   * @throws {Error}   BigPoppaClientError
   * @returns {Object}
   */
  static updateResponseHandler (res) {
    return Promise.try(BigPoppaClient.checkResponseForError.bind(null, res))
      .then(res => {
        let body = {
          model: res.body
        }
        try {
          let updates = JSON.parse(res.headers['model-updates'])
          body.updates = updates
        } catch (err) {}
        return body
      })
  }

  /**
   * Given an internal orgId, fetch the matching org
   *
   * @param {String} orgId - internal Postgres Id for the organization
   *
   * @resolves {Organization} requested org
   * @rejects  {Error}        when an orgId is not provided
   */
  getOrganization (orgId) {
    if (!orgId) {
      return Promise.reject(new Error('missing orgId'))
    }
    var path = '/organization/' + encodeURIComponent(orgId)
    return this.getAsync(BigPoppaClient.getOpts(path))
      .then(BigPoppaClient.responseHandler)
  }

  /**
   * Fetches a list of orgs matching the optional parameters, or returns all of them when none are
   * given
   *
   * @param {Object} opts          - optional parameters
   * @param {String} opts.githubId - githubId of an organization
   * @param {String} opts.name     - name of an organization
   *
   * @returns  {Promise}
   * @resolves {[Organization]} requested orgs
   */
  getOrganizations (opts) {
    var path = '/organization/'
    if (opts) {
      path += BigPoppaClient.parseOpts(opts)
    }
    return this.getAsync(BigPoppaClient.getOpts(path))
      .then(BigPoppaClient.responseHandler)
  }

  /**
   * Given an internal orgId, update the matching org with the given updates
   *
   * @param {String} orgId - internal Postgres Id for the organization
   * @param {Object} updates - update body
   *
   * @returns  {Promise}
   * @resolves {Organization} updated requested org
   * @rejects  {Error}        when an orgId is not provided
   */
  updateOrganization (orgId, updates) {
    if (!orgId) {
      return Promise.reject(new Error('missing orgId'))
    }
    var path = '/organization/' + encodeURIComponent(orgId)
    return this.patchAsync(BigPoppaClient.getOpts(path, updates))
      .then(BigPoppaClient.updateResponseHandler)
  }

  /**
   * Given an internal userId, fetch the matching user
   *
   * @param {String} userId - internal Postgres Id for the user
   *
   * @returns  {Promise}
   * @resolves {Organization} requested user
   * @rejects  {Error}        when an UserId is not provided
   */
  getUser (userId) {
    if (!userId) {
      return Promise.reject(new Error('missing userId'))
    }
    var path = '/user/' + encodeURIComponent(userId)
    return this.getAsync(BigPoppaClient.getOpts(path))
      .then(BigPoppaClient.responseHandler)
  }

  /**
   * Fetches a list of user matching the optional parameters, or returns all of them when none are
   * given
   *
   * @param {Object} opts          - optional parameters
   * @param {String} opts.githubId - githubId of a user
   *
   * @returns  {Promise}
   * @resolves {[User]} requested users
   */
  getUsers (opts) {
    var path = '/user/'
    if (opts) {
      path += BigPoppaClient.parseOpts(opts)
    }
    return this.getAsync(BigPoppaClient.getOpts(path))
      .then(BigPoppaClient.responseHandler)
  }

  /**
   * Given the PostGres IDs of a user and organization, create an association
   *
   * @param {Number} orgId  - Organization PostGres ID
   * @param {Number} userId - User PostGres ID
   *
   * @resolves {Organization} organization model containing the updated list of users
   */
  addUserToOrganization (orgId, userId) {
    if (!orgId) {
      return Promise.reject(new Error('missing orgId'))
    } else if (!userId) {
      return Promise.reject(new Error('missing userId'))
    }
    var path = '/organization/' + encodeURIComponent(orgId) + '/add'
    return this.patchAsync(BigPoppaClient.getOpts(path, { user: { id: userId } }))
      .then(BigPoppaClient.responseHandler)
  }

  /**
   * Creates or updates the big poppa user then returns the user object
   *
   * @param {Number} githubId - githubId of a user
   * @param {String} accessToken - Github access token
   *
   * @returns  {Promise}
   * @resolves {User} updated user
   */
  createOrUpdateUser (githubId, accessToken) {
    return this.postAsync(BigPoppaClient.getOpts('/user/', { githubId, accessToken }))
      .then(BigPoppaClient.updateResponseHandler)
  }
}
