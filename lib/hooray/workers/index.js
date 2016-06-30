'use strict'
require('loadenv')()
console.log(process.env)

const CriticalError = require('error-cat/errors/critical-error')
const ErrorCat = require('error-cat')
const log = require('../logger').child({ module: 'worker' })
const ponos = require('ponos')

/**
 * The big-poppa/hooray ponos server.
 * @type {ponos~Server}
 * @module hooray/worker
 */
const server = module.exports = new ponos.Server({
  name: 'hooray',
  rabbitmq: {
    hostname: process.env.RABBITMQ_PONOS_HOSTNAME,
    port: process.env.RABBITMQ_PONOS_PORT,
    username: process.env.RABBITMQ_USERNAME,
    password: process.env.RABBITMQ_PASSWORD
  },
  errorCat: ErrorCat,
  log: log
})

server.setAllTasks({
  'organization.create': require('./organization.create'),
  'organization.delete': require('./organization.delete'),
  'user.create': require('./user.create'),
  'user.delete': require('./user.delete'),
  'organization.user.add': require('./organization.user.add'),
  'organization.user.remove': require('./organization.user.remove')
})

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
