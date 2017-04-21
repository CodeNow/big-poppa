const drc = require('docker-registry-client')
const Promise = require('bluebird')

module.exports = {
  validateCredentials: (url, username, password) => {
    return Promise.fromCallback(cb => drc.login({
      index: url,
      username,
      password
    }, cb))
  }
}
