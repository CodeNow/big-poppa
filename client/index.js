'use strict'

const ApiClient = require('simple-api-client')
const Promise = require('bluebird')

Promise.promisifyAll(ApiClient)
Promise.promisifyAll(ApiClient.prototype)

module.exports = class BigPoppaClient extends ApiClient {

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
    return this.getAsync({
      path: path,
      json: true
    })
      .tap(res => {
        if (res.statusCode >= 400) {
          throw Error(res.body.message)
        }
      })
      .get('body')
  }

  /**
   * Fetches a list of orgs matching the optional parameters, or returns all of them when none are
   * given
   *
   * @param {Object} opts          - optional parameters
   * @param {String} opts.githubId - githubId of an organization
   *
   * @returns  {Promise}
   * @resolves {[Organization]} requested orgs
   */
  getOrganizations (opts) {
    var path = '/organization/'
    if (opts.githubId) {
      path += '?githubId=' + encodeURIComponent(opts.githubId)
    }
    return this.getAsync({
      path: path,
      json: true
    })
      .tap(res => {
        if (res.statusCode >= 400) {
          throw Error(res.body.message)
        }
      })
      .get('body')
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
    return this.patchAsync({
      body: updates,
      path: path,
      json: true
    })
      .tap(res => {
        if (res.statusCode >= 400) {
          throw Error(res.body.message)
        }
      })
      .get('body')
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
    return this.getAsync({
      path: path,
      json: true
    })
      .tap(res => {
        if (res.statusCode >= 400) {
          throw Error(res.body.message)
        }
      })
      .get('body')
  }

  /**
   * Fetches a list of user matching the optional parameters, or returns all of them when none are
   * given
   *
   * @param {Object} opts          - optional parameters
   * @param {String} opts.githubId - githubId of a user
   *
   * @returns  {Promise}
   * @resolves {[Organization]} requested users
   */
  getUsers (opts) {
    var path = '/user/'
    if (opts.githubId) {
      path += '?githubId=' + encodeURIComponent(opts.githubId)
    }
    return this.getAsync({
      path: path,
      json: true
    })
      .tap(res => {
        if (res.statusCode >= 400) {
          throw Error(res.body.message)
        }
      })
      .get('body')
  }
}
