'use strict'

const hermes = require('../hermes')
const log = require('../logger').child({ module: 'worker/server' })
const ponos = require('ponos')

/**
 * The cream/user-management ponos server.
 * @type {ponos~Server}
 * @module user-management/worker
 */
const server = module.exports = new ponos.Server({
  hermes: hermes,
  log: log
})

server.setTask('organization.create', require('./organization.create'))
server.setTask('organization.delete', require('./organization.delete'))
