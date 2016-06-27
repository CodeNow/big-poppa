'use strict'

require('loadenv')({ project: 'hooray', debugName: 'big-poppa:hooray:env' })

var logger = require('../common/logger')

/**
 * Bunyan logger for big-poppa/hooray.
 * @module big-poppa:hooray:logger
 */
module.exports = logger.create('hooray', {})
