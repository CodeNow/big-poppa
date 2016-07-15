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
    this.app = Server.createApp()
  }

  static createApp () {
    const app = express()

    // Load middleware
    app.use(bodyParser.json())

    // Load Routes
    log.trace('Setting routes')
    app.use('/organization', OrganizationRouter.router())
    app.use('/user', UserRouter.router())
    return app
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
