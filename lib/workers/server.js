'use strict'

const ErrorCat = require('error-cat')
const log = require('util/logger').child({ module: 'worker-server' })
const ponos = require('ponos')

/**
 * The big-poppa ponos server.
 * @type {ponos~Server}
 * @module big-poppa/worker
 */
module.exports = new ponos.Server({
  name: process.env.APP_NAME,
  enableErrorEvents: true,
  rabbitmq: {
    channel: {
      prefetch: process.env.RABBITMQ_PREFETCH
    },
    hostname: process.env.RABBITMQ_HOSTNAME,
    port: process.env.RABBITMQ_PORT,
    username: process.env.RABBITMQ_USERNAME,
    password: process.env.RABBITMQ_PASSWORD
  },
  errorCat: ErrorCat,
  log: log,
  tasks: {
    'organization.user.remove': require('./organization.user.remove'),
    'organization.user.add': require('./organization.user.add')
  },
  events: {
    'organization.authorized': require('./organization.authorized'),
    'organization.integration.prbot.disabled': require('./organization.integration.prbot.disabled.js'),
    'organization.integration.prbot.enabled': require('./organization.integration.prbot.enabled.js'),
    'organization.user.added': require('./organization.user.added'),
    'user.authorized': require('./user.authorized')
  }
})
