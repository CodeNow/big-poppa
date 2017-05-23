'use strict'

require('loadenv')({ project: 'big-poppa', debugName: 'big-poppa:env' })
const _ = require('lodash')
const bunyan = require('bunyan')
const cls = require('continuation-local-storage')
const exists = require('101/exists')

function deepSerialize (data) {
  return Object.keys(data).reduce((serializedData = {}, key) => {
    if (serializers[key]) {
      serializedData[key] = serializers[key](data[key])
    } else {
      serializedData[key] = data[key]
    }
    return serializedData
  }, {})
}

const serializers = {
  tx: function () {
    let out
    try {
      out = {
        tid: cls.getNamespace('ponos').get('tid')
      }
    } catch (e) {
      // cant do anything here
    }
    return out
  },
  job: deepSerialize,
  originalJobPayload: deepSerialize,
  data: deepSerialize,
  error: deepSerialize,
  env: envSerializer,
  err: errorSerializer,
  req: reqSerializer,
  password: function () {
    return '***SANITIZED***'
  }
}

/**
 * Creates a new big-poppa logger with the given name and custom serializers.
 *
 * @param {string}    name        - Name for the bunyan logger.
 * @returns {bunyan}              - A bunyan logger.
 */
function create (name) {
  return bunyan.createLogger({
    name: process.env.APP_NAME,
    streams: [
      {
        level: process.env.LOG_LEVEL_STDOUT,
        stream: process.stdout
      }
    ],
    serializers: _.defaults(serializers, bunyan.stdSerializers)
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
  // TODO: Write a better serializer for JOI errorso
  // https://github.com/hapijs/joi/blob/v8.0.5/API.md#errors
  return obj
}

function reqSerializer (req) {
  return Object.assign({}, {
    params: req.params,
    body: req.body,
    query: req.query,
    path: req.path,
    method: req.method,
    url: req.url,
    headers: req.headers
  })
}

/**
 * Bunyan logger for big-poppa.
 * @module big-poppa:logger
 */
module.exports = create('big-poppa', {})
