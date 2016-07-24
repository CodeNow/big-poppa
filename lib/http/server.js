'use strict'

require('loadenv')()

const Promise = require('bluebird')
const http = require('http')
// const fs = Promise.promisifyAll(require('fs'))
const express = require('express')
const bodyParser = require('body-parser')

const OrganizationRouter = require('http/routes/organization')
const UserRouter = require('http/routes/user')
const log = require('util/logger').child({ module: 'http/server' })

/**
 * Module level wrapper for the big-poppa HTTPS server.
 */
class Server {

  /**
   * Instantiate the express app
   */
  constructor () {
    this.app = Server.createApp()
  }

  /**
   * Create an express app with all its routes and middleware
   *
   * @returns {Object} - Express app instance
   */
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

  /**
   * Start the app by create an HTTPS Server
   *
   * @resolves{void}
   * @return {Promise}
   */
  start () {
    // const opts = {
      // key: fs.readFileSync('lib/certs/server.key'),
      // cert: fs.readFileSync('lib/certs/server.crt'),
      // ca: fs.readFileSync('lib/certs/server.csr')
    // }
    this.httpsServer = http.createServer(this.app)
    return Promise.fromCallback(cb => {
      this.httpsServer.listen(process.env.HTTPS_PORT, cb)
    })
  }

  /**
   * Stop the HTTP server
   *
   * @resolves{void}
   * @return {Promise}
   */
  stop () {
    return Promise.fromCallback(cb => this.httpsServer.close(cb))
  }

}

module.exports = new Server()
