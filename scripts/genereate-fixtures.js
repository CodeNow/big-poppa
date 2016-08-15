'use strict'
require('loadenv')()

const Promise = require('bluebird')
const GitHub = require('github')
const fs = Promise.promisifyAll(require('fs'))

const fixturePath = 'test/fixtures/github'

let github = new GitHub({
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

github.authenticate({
  type: 'oauth',
  token: process.env.GITHUB_TOKEN
})

const convertToJSModule = (fileName, jsonObject) => {
  let contents = 'module.exports = ' + JSON.stringify(jsonObject, null, 2).replace(/"/g, "'") + '\n'
  return fs.writeFileAsync(`${fixturePath}/${fileName}`, contents)
}

const getGithubUser = (fileName, githubId) => {
  return Promise.fromCallback(cb => {
    return github.users.getById({ id: githubId }, cb)
  })
    .then(org => convertToJSModule(fileName, org))
}

const getMembership = (fileName, githubOrgName) => {
  return Promise.fromCallback(cb => {
    return github.users.getOrganizationMembership({ org: githubOrgName }, cb)
  })
    .then(org => convertToJSModule(fileName, org))
}

const getNotFound = (fileName, githubId) => {
  return Promise.fromCallback(cb => {
    return github.users.getById({ id: githubId }, cb)
  })
    .catch(err => convertToJSModule(fileName, JSON.parse(err.message)))
}

Promise.all([
  getGithubUser('organization.js', 2828361),
  getGithubUser('organization-2.js', 2335750),
  getGithubUser('user.js', 1981198),
  getNotFound('not-found.js', 999999999999999),
  getGithubUser('other-user.js', 6379413),
  getMembership('org-membership.js', 'runnable')
])
