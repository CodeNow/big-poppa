'use strict'
require('loadenv')({ project: 'big-poppa', debugName: 'big-poppa:env' })

const Promise = require('bluebird')
const GitHub = require('github')

const GithubEntityTypeError = require('errors/github-entity-type-error')
const GithubEntityNotFoundError = require('errors/github-entity-not-found-error')

const github = new GitHub({

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

github.authenticate({
  type: 'oauth',
  token: process.env.GITHUB_TOKEN
})

module.exports = class GithubAPI {

  /**
   * Fetches an organization from github
   *
   * @param {Number}     githubId           - Organization github id
   * @resolves {Object}  githubOrganization - JSON object returned by Github API
   * @returns {Promise}
   */
  static getOrganization (githubId) {
    return Promise.fromCallback(cb => {
      return github.users.getById({ id: githubId }, cb)
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
   * Fetches a user from github
   *
   * @param {Number}     githubId           - User github id
   * @resolves {Object}  githubOrganization - JSON object returned by Github API
   * @returns {Promise}
   */
  static getUser (githubId) {
    return Promise.fromCallback(cb => {
      return github.users.getById({ id: githubId }, cb)
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
}
