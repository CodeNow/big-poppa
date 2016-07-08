'use strict'

require('loadenv')({ project: 'big-poppa', debugName: 'big-poppa:env' })
const bunyan = require('bunyan')
const exists = require('101/exists')
const defaults = require('101/defaults')

/**
 * Common logging serializers for all big-poppa sub-projects.
 * @type {object}
 */
var baseSerializers = {
  err: errorSerializer,
  env: envSerializer
}

defaults(baseSerializers, bunyan.stdSerializers)

/**
 * Creates a new big-poppa logger with the given name and custom serializers.
 *
 * @param {string}    name        - Name for the bunyan logger.
 * @param {object}    serializers - Custom serializers for the logger.
 * @returns {bunyan}              - A bunyan logger.
 */
function create (name, serializers) {
  serializers = serializers || {}
  defaults(serializers, baseSerializers)
  return bunyan.createLogger({
    name: 'big-poppa',
    streams: [
      {
        level: process.env.LOG_LEVEL_STDOUT,
        stream: process.stdout
      }
    ],
    serializers: {}
  })
}

/**
 * The node process environment often contains a lot of useless information
 * this reduces the verbosity of a reported environment.
 * @param {object}   env - The environment to report.
 * @return {object}      - A stripped down version with only relevant environment
 *   variables.
 */
function envSerializer (env) {
  var obj = {}

  // Keep the git head variable (it is actually useful)
  if (exists(env.npm_package_gitHead)) {
    obj.npm_package_gitHead = env.npm_package_gitHead
  }

  // Filter out the kinda useless and verbose `npm_*` variables
  Object.keys(env).forEach(function (key) {
    if (key.match(/^npm_/)) { return }
    obj[key] = env[key]
  })
  return obj
}

/**
 * Bunyan error serializer. Handles additional data field added by ErrorCat.
 * @param {Error}    err - Error to serialize.
 * @return {object}      - The serialized error object.
 */
function errorSerializer (err) {
  var obj = bunyan.stdSerializers.err(err)
  if (exists(err.data)) {
    obj.data = err.data
  }
  return obj
}

/**
 * Bunyan logger for big-poppa.
 * @module big-poppa:logger
 */
module.exports = create('big-poppa', {})
