'use strict'

require('loadenv')({ project: 'user-management', debugName: 'cream:user-management:env' })

var logger = require('../common/logger')

/**
 * Bunyan logger for cream/user-management.
 * @module cream:user-management:logger
 */
module.exports = logger.create('user-management', {})
