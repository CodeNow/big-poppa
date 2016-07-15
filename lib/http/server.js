'use strict'

require('loadenv')()

const Promise = require('bluebird')
const http = require('http')
const express = require('express')
const bodyParser = require('body-parser')

const OrganizationRouter = require('http/routes/organization')
const UserRouter = require('http/routes/user')
const log = require('util/logger').child({ module: 'http/server' })

/**
 * Module level wrapper for the big-poppa webhook HTTP server.
 */
class Server {

  constructor () {
    this.app = express()

    // Load middleware
    this.app.use(bodyParser.json())

    // Load Routes
    log.trace('Setting routes')
    this.app.use('/organization', OrganizationRouter.router())
    this.app.use('/user', UserRouter.router())
  }

  start () {
    this.httpServer = http.createServer(this.app)
    return Promise.fromCallback(cb => {
      this.httpServer.listen(process.env.HTTP_PORT, cb)
    })
  }

  stop () {
    return Promise.fromCallback(this.httpServer.close.bind(this))
  }

}

module.exports = new Server()
