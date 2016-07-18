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
  static createRoute (routerFunction, schema) {
    if (!routerFunction) {
      throw new Error('There is no router defined')
    }
    if (!schema) {
      throw new Error('There is no schema specified for this route')
    }
    // Bind `errorHandler` to its router
    let errorHandler = this.errorHandler.bind(this)
    return Promise.method(function () {
      let args = [].slice.call(arguments)
      // Get request and splice off first element
      let rawRequest = args.shift(0)
      // Get a reference to the response to pass to the errorHandler
      let res = args[0]
      // Validate request against schema. Strip anything not specified in the
      // schema
      return Joi.validateAsync(rawRequest, schema, { stripUnknown: true })
        // Replace original request with validated request
        .then(request => routerFunction.apply(routerFunction, [request].concat(args)))
        // Pass original request, response, and error to `errorHandler`
        .catch(err => errorHandler(rawRequest, res, err))
    })
  }

  /**
   * Handle errors
   */
  static errorHandler (req, res, err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ message: 'Resource Not Found', err: err })
    }
    if (err.isJoi) {
      return res.status(400).json({ message: 'Validation Error', err: err })
    }
    return res.status(500).json({ message: 'Internal Server Error', err: err })
  }

}
