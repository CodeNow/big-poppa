'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))

const logger = require('util/logger').child({ module: 'BaseRouter' })

const ForeignKeyError = require('errors/foreign-key-error')
const GithubEntityError = require('errors/github-entity-error')
const GithubEntityNoPermissionError = require('errors/github-entity-no-permission-error')
const NotFoundError = require('errors/not-found-error')
const NotNullError = require('errors/not-null-error')
const UnauthorizedError = require('errors/unauthorized-error')
const GenericRegistryError = require('errors/generic-registry-error')
const UniqueError = require('errors/unique-error')

module.exports = class BaseRouter {

  /**
   * Create a route. Take a route and a schema and returns a new route function that
   * validates against the schema and handles errors.
   *
   * This method should only handle two things for routes:
   *
   * 1. Validation
   * 2. Error handling
   *
   * If that's not the case, it should not be here.
   *
   * Please don't turn this little, simple function in a beautiful,
   * unmaintainable explosion of TJ magic.
   *
   * @param {Function}    routerFunction - Function that takes a request and a response
   * @param {Object}      schema         - A joi schema to validate the request
   * @returns {Function}                 - A function that can be passed to an express router
   */
  static createRoute (routerFunction, schema) {
    if (!routerFunction) {
      throw new Error('There is no router defined')
    }
    if (!schema) {
      throw new Error('There is no schema specified for this route')
    }
    // Bind `errorHandler` to its router
    const errorHandler = this.errorHandler.bind(this)
    return Promise.method(function () {
      const log = logger.child({ method: 'createRoute' })
      log.info('Route called')
      let args = [].slice.call(arguments)
      // Get request and splice off first element
      let rawRequest = args.shift(0)
      // Get a reference to the response to pass to the errorHandler
      let res = args[0]
      // Validate request against schema. Strip anything not specified in the
      // schema
      log.trace({ req: rawRequest }, 'Route request')
      /**
       * First `validatAsync` stripes out any unknown properties
       * Second `validateAsync` ensures there are no unknown properties present
       * in required object
       *
       * Unfortunately, we need to do this twice because `Joi` does not assert
       * absence of  unknown properties when the `stripUnknown` flag is passed
       */
      return Promise.join(
        Joi.validateAsync(rawRequest, schema, { stripUnknown: true }),
        Joi.validateAsync(rawRequest, schema)
      )
        .spread((strippedRequest, request) => strippedRequest)
        .tap(request => log.trace({ request: request }, 'Router handler validated'))
        // Replace original request with validated request
        .then(request => routerFunction.apply(routerFunction, [request].concat(args)))
        // Pass original request, response, and error to `errorHandler`
        .catch(err => errorHandler(res, err))
    })
  }

  /**
   * Handle all errors thrown by routes. Invokes the response `status` and `json`
   * methods to provide a response according to the error provided.
   *
   * @param {Object}    response - Express response object
   * @param {Error}     err      - Error thrown by router
   * @returns {Object}           - Express response object
   */
  static errorHandler (res, err) {
    const log = logger.child({ method: 'errorHandler', err: err, stack: err.stack })
    log.info('errorHandler called')
    if (err instanceof NotFoundError) {
      log.error('404 NotFoundError')
      return res.status(404).json({ statusCode: 404, message: `Resource Not Found: ${err.message}`, err: err })
    }
    if (err instanceof GithubEntityNoPermissionError) {
      log.error('403 Caught exception - GithubEntityNoPermissionError')
      return res.status(403).json({ statusCode: 403, message: `Forbidden: ${err.toString()}`, err: err })
    }
    if (err.isJoi) {
      log.error('400 Validation Error')
      return res.status(400).json({ statusCode: 400, message: err.toString(), err: err.message })
    }
    if (err instanceof UnauthorizedError) {
      log.error('Unauthorized Error')
      return res.status(401).json({ statusCode: 401, message: err.toString(), err })
    }
    if (err instanceof GenericRegistryError) {
      log.error('Generic Registry Error')
      return res.status(400).json({ statusCode: 400, message: err.toString(), err })
    }
    // If this is an error we caught, pass this error back to the user
    if (
      err instanceof UniqueError ||
      err instanceof GithubEntityError ||
      err instanceof NotNullError ||
      err instanceof ForeignKeyError
    ) {
      log.error('400 Caught exception')
      return res.status(400).json({ statusCode: 400, message: err.toString(), err: err })
    }
    log.error('500 Internal Server Error')
    return res.status(500).json({ statusCode: 500, message: 'Internal Server Error', err: err.message })
  }

}
