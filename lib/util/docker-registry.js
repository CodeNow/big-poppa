const dockerRegistryClient = require('docker-registry-client')
const logger = require('util/logger').child({ module: 'http/server' })
const Promise = require('bluebird')
const RegistryDoesNotSupportLoginError = require('errors/registry-does-not-support-login-error')
const UnauthorizedError = require('errors/unauthorized-error')

module.exports = {
  validateCredentials: (url, username, password) => {
    const log = logger.child({ method: 'validateCredentials', url, username, password: !!password })
    log.trace('called')
    return Promise.fromCallback(cb => {
      return dockerRegistryClient.login({
        index: url,
        log,
        password,
        username
      }, (err, body) => {
        log.info(arguments, 'info arguments for dockerRegistryClient login')
        log.trace(arguments, 'trace arguments for dockerRegistryClient login')
        log.info('info arguments for dockerRegistryClient login')
        log.trace('trace arguments for dockerRegistryClient login')
        if (err) {
          return cb(err)
        }
        if (!err) {
          return cb(null, body)
        }
        // if (res.statusCode === 401) {
        //   return cb(new UnauthorizedError('The registry authentication failed'))
        // }
        // if (res.statusCode === 404) {
        //   return cb(new RegistryDoesNotSupportLoginError('This registry does not support authentication through Docker v1 or v2 apis'))
        // }
      })
    })
  }
}
