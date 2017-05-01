const dockerRegistryClient = require('docker-registry-client')
const Promise = require('bluebird')
const logger = require('util/logger').child({ module: 'http/server' })
const UnauthorizedError = require('errors/unauthorized-error')
const RegistryDoesNotSupportLoginError =  require('errors/registry-does-not-support-login-error')

module.exports = {
  validateCredentials: (url, username, password) => {
    const log = logger.child({ method: 'validateCredentials', url, username })
    log.trace('called')
    return Promise.fromCallback(cb => {
      return dockerRegistryClient.login({
          index: url,
          log,
          password,
          username
        }, (err, body, res) => {
          if (err) {
            return cb(err)
          }
          if (res.statusCode === 200) {
            return cb(null, body)
          }
          if (res.statusCode === 401) {
            return cb(new UnauthorizedError('The registry authentication failed'))
          }
          if (res.statusCode === 404) {
            return cb(new RegistryDoesNotSupportLoginError('This registry does not support authentication through Docker v1 or v2 apis'))
          }
      })
    })
  }
}
