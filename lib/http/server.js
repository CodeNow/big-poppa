'use strict'

require('loadenv')()

const Promise = require('bluebird')
const express = require('express')
const organizationRouter = require('http/routes/organization')
const userRouter = require('http/routes/user')
const log = require('util/logger').child({ module: 'http/server' })

/**
 * Module level wrapper for the big-poppa webhook HTTP server.
 */
class Server {

  constructor () {
    this.app = express()
    // Load Routes
    this.app.use('/organization', organizationRouter)
    this.app.use('/user', userRouter)
  }

  start () {
    return Promise.try(() => {
      this.app.listen(3000);
    })
  }

  stop () {

  }

}

module.exports = new Server()
