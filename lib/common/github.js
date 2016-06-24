const Promise = require('bluebird')
const GitHubAPI = require('github')

const github = new GitHubAPI({
  protocol: 'https',
  timeout: 5000,
  headers: {
    'user-agent': 'cream'
  }
})

github.authenticate({
  type: 'oauth',
  token: process.env.GITHUB_TOKEN
})

module.exports = class GithubAPI {

  static isOrganization (githubId) {
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

}
