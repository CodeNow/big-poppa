'use strict'

const CriticalError = require('error-cat/errors/critical-error')
const ErrorCat = require('error-cat')
const log = require('util/logger').child({ module: 'worker-server' })

const server = require('workers/server')

server.start()
  .then(() => {
    log.info('Worker Server Started')
  })
  .catch(err => {
    log.fatal({ err: err }, 'Worker server failed to start')
    ErrorCat.report(new CriticalError(
      'Worker Server Failed to Start',
      { err: err }
    ))
    process.exit(1)
  })
