'use strict'
require('loadenv')({ project: 'big-poppa:common', debugName: 'big-poppa:hooray:env' })

const Promise = require('bluebird')
const GitHubAPI = require('github')

const GithubEntityTypeError = require('common/errors/github-entity-type-error')
const GithubEntityNotFoundError = require('common/errors/github-entity-not-found-error')

const github = new GitHubAPI({

  // Github cache configuration
  protocol: process.env.GITHUB_PROTOCOL,
  host: process.env.GITHUB_VARNISH_HOST,
  port: process.env.GITHUB_VARNISH_PORT,

  timeout: 5000,
  requestMedia: 'application/json',
  headers: {
    'user-agent': 'big-poppa'
  }
})

github.authenticate({
  type: 'oauth',
  token: process.env.GITHUB_TOKEN
})

module.exports = class GithubAPI {

  static getOrganization (githubId) {
    return Promise.fromCallback(cb => {
      return github.users.getById({ id: githubId }, cb)
    })
      .then(function (org) {
        if (!org) throw new GithubEntityNotFoundError('Github organization not found.', { githubId: githubId })
        if (org.type !== 'Organization') {
          throw new GithubEntityTypeError('Github entity is not a organization', { res: org, githubId: githubId })
        }
        return org
      })
  }

  static getUser (githubId) {
    return Promise.fromCallback(cb => {
      return github.users.getById({ id: githubId }, cb)
    })
      .then(function (user) {
        if (!user) throw new GithubEntityNotFoundError('User not found', { githubId: githubId })
        if (user.type !== 'User') {
          throw new GithubEntityTypeError('Entity is not a user', { res: user, githubId: githubId })
        }
        return user
      })
  }
}
