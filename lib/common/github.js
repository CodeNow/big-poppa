'use strict'
require('loadenv')({ project: 'big-poppa:common', debugName: 'big-poppa:hooray:env' })

const Promise = require('bluebird')
const GitHubAPI = require('github')

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
      .then(function (user) {
        if (user.type === 'Organization') {
          return user
        }
        return null
      })
  }

  static getUser (githubId) {
    return Promise.fromCallback(cb => {
      return github.users.getById({ id: githubId }, cb)
    })
      .then(function (user) {
        if (user.type === 'User') {
          return user
        }
        return null
      })
  }
}
