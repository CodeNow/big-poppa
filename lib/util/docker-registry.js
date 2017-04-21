const drc = require('docker-registry-client')
const Promise = require('bluebird')
const logger = require('util/logger').child({ module: 'http/server' })

module.exports = {
  validateCredentials: (url, username, password) => {
    const log = logger.child({ method: 'validateCredentials', url, username })
    log.trace('called')
    return Promise.fromCallback(cb => drc.login({
      index: url,
      log,
      password,
      username
    }, cb))
  }
}
