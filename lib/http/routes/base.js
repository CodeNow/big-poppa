'use strict'

const NotFoundError = require('errors/not-found-error')

module.exports = class BaseRouter {

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
