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
        if (!org) throw GithubEntityNotFoundError('Organization not found')
        if (org.type !== 'Organization') throw GithubEntityTypeError('Entity is not a organization')
        return org
      })
  }

  static getUser (githubId) {
    return Promise.fromCallback(cb => {
      return github.users.getById({ id: githubId }, cb)
    })
      .then(function (user) {
        if (!user) throw GithubEntityNotFoundError('User not found')
        if (user.type !== 'User') throw GithubEntityTypeError('Entity is not a user')
        return user
      })
  }
}
