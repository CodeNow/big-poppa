const dockerRegistryClient = require('docker-registry-client')
const dockerRegistryClientErrors = require('docker-registry-client/lib/errors') // Digs a bit deep, but is useful
const logger = require('util/logger').child({ module: 'http/server' })
const Promise = require('bluebird')
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
        if (err) {
          return cb(err)
        }
        if (!err) {
          return cb(null, body)
        }
      })
    })
      .catch(dockerRegistryClientErrors.UnauthorizedError, (err) => {
        throw new UnauthorizedError(err.message)
      })
  }
}
