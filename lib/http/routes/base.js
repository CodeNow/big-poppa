'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))

const NotFoundError = require('errors/not-found-error')

module.exports = class BaseRouter {

  /**
   * Create a route
   *
   * Take a route and a schema and add the validation for it
   */
  static createRoute (router, schema) {
    return function () {
      let args = [].slice.call(arguments)
      if (schema) {
        // Get request and splice off first element
        let rawRequest = args.shift(0)
        return Joi.validateAsync(rawRequest, schema, { stripUnknown: true })
          .then(request => router.apply(router, [request].concat(args)))
          .catch(this.errorHandler.bind(this, args[0], args[1]))
      }
      return router.apply(router, args)
        .catch(this.errorHandler.bind(this, args[0], args[1]))
    }
  }

  /**
   * Handle errors
   */
  static errorHandler (req, res, err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ errCode: 404, err: err.message })
    }
    if (err.isJoi) {
      return res.status(400).json({ errCode: 400, err: err.message })
    }
    // TODO: Write universal HTTP error handler
    return res.json({ err: err })
  }

}
