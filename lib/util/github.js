'use strict'
require('loadenv')({ project: 'big-poppa', debugName: 'big-poppa:env' })

const Promise = require('bluebird')
const GitHub = require('github')
const log = require('util/logger').child({ module: 'util/github' }).child({})

const GithubEntityTypeError = require('errors/github-entity-type-error')
const GithubEntityNotFoundError = require('errors/github-entity-not-found-error')
const GithubEntityNoPermissionError = require('errors/github-entity-no-permission-error')
const GithubEntityError = require('errors/github-entity-error')

module.exports = class GithubAPI {
  constructor (token) {
    this.github = new GitHub({
      version: '3.0.0',
      // Github cache configuration
      protocol: process.env.GITHUB_PROTOCOL,
      host: process.env.GITHUB_VARNISH_HOST,
      port: process.env.GITHUB_VARNISH_PORT,

      timeout: 5000,
      requestMedia: 'application/json',
      headers: {
        'user-agent': process.env.APP_NAME
      }
    })
    this.github.authenticate({
      type: 'oauth',
      token: token || process.env.GITHUB_TOKEN
    })
  }

  /**
   * Fetches an organization from github
   *
   * @param {Number}     githubId           - Organization github id
   * @resolves {Object}  githubOrganization - JSON object returned by Github API
   * @returns {Promise}
   */
  getOrganization (githubId) {
    return Promise.fromCallback(cb => {
      return this.github.users.getById({ id: githubId }, cb)
    })
      .then(function (org) {
        if (org.type !== 'Organization') {
          throw new GithubEntityTypeError('Github entity is not a organization', { res: org, githubId: githubId })
        }
        return org
      })
      .catch(err => {
        if (err.code === 404) {
          throw new GithubEntityNotFoundError('Github organization not found.', { githubId: githubId })
        }
        throw err
      })
  }

  /**
   * Fetches the members of an organization from github
   *
   * @resolves {[Object]} githubOrganization - JSON object returned by Github API
   * @throws   {GithubEntityError}             when any error occurs when attempting to fetch a user's orgs
   */
  getOrgsForUser (githubId) {
    return Promise.fromCallback(cb => {
      return this.github.users.getOrgs({}, cb)
    })
      .catch(err => {
        throw new GithubEntityError('Could not fetch orgs for the given user', {
          githubId: githubId,
          originalErrorMessage: err.message
        })
      })
  }

  /**
   * Fetches the user from github
   *
   * @resolves {User} - JSON object for the user returned by Github API
   * @returns {Promise}
   */
  getSelf () {
    return Promise.fromCallback(cb => {
      return this.github.users.get({}, cb)
    })
  }

  /**
   * Fetches the primary email address from github
   *
   * @param {Number}     githubId           - Organization github id
   *
   * @resolves {String}          user's email address
   * @returns {Promise}
   * @throws {GithubEntityError} when the query fails
   */
  getPrimaryEmailAddress (githubId) {
    return Promise.fromCallback(cb => {
      return this.github.users.getEmails({
        page: 0,
        per_page: 100
      }, cb)
    })
      .then(emails => {
        return emails.find(email => {
          return email.primary
        })
      })
      .get('email')
      .catch(err => {
        throw new GithubEntityError('Could not fetch email addresses for the given user', {
          githubId: githubId,
          originalErrorMessage: err.message
        })
      })
  }

  /**
   * Fetches a user from github
   *
   * @param {Number}     githubId           - User github id
   * @resolves {Object}  githubOrganization - JSON object returned by Github API
   * @returns {Promise}
   */
  getUser (githubId) {
    return Promise.fromCallback(cb => {
      return this.github.users.getById({ id: githubId }, cb)
    })
      .then(function (user) {
        if (user.type !== 'User') {
          throw new GithubEntityTypeError('Entity is not a user', { res: user, githubId: githubId })
        }
        return user
      })
      .catch(err => {
        if (err.code === 404) {
          throw new GithubEntityNotFoundError('Github organization not found.', { githubId: githubId })
        }
        throw err
      })
  }

  /**
   * Checks if a user (the user who owns the accessToken) belongs to a given org
   *
   * @param {String} orgGithubUsername  - Organization's Github username
   *
   * @resolves {Object}      JSON object returned by Github API
   * @throws   {GithubError} when the user does not have access to the given org in Github
   *
   * https://developer.github.com/v3/orgs/members/#get-your-organization-membership
   */
  hasUserOrgMembership (orgGithubName) {
    log.trace({ orgGithubName: orgGithubName }, 'hasUserOrgMembership')
    return Promise.fromCallback(cb => {
      return this.github.users.getOrganizationMembership({ org: orgGithubName }, cb)
    })
      .catch(err => {
        throw new GithubEntityNoPermissionError(
          'User does not belong to the given org.',
          { error: err, githubOrgName: orgGithubName }
        )
      })
  }
}
