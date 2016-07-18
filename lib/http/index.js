'use strict'

require('loadenv')()

const CriticalError = require('error-cat/errors/critical-error')
const ErrorCat = require('error-cat')
const log = require('util/logger').child({ module: 'http' })
const server = require('http/server')

server.start()
  .catch((err) => {
    log.fatal({ err: err }, 'Big-poppa HTTP Server Failed to Start')
    ErrorCat.report(new CriticalError(
      'Big-poppa HTTP Server Failed to Start',
      { err: err }
    ))
    process.exit(1)
  })