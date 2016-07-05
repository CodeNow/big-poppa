'use strict'

require('loadenv')({ project: 'prometheus', debugName: 'big-poppa:prometheus:env' })

var logger = require('../common/logger')

/**
 * Bunyan logger for big-poppa/prometheus.
 * @module big-poppa:prometheus:logger
 */
module.exports = logger.create('prometheus', {})
