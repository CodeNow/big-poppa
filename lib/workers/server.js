'use strict'

const ErrorCat = require('error-cat')
const log = require('util/logger').child({ module: 'worker-server' })
const ponos = require('ponos')

/**
 * The big-poppa ponos server.
 * @type {ponos~Server}
 * @module big-poppa/worker
 */
const server = module.exports = new ponos.Server({
  name: process.env.APP_NAME,
  rabbitmq: {
    hostname: process.env.RABBITMQ_HOSTNAME,
    port: process.env.RABBITMQ_PORT,
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
