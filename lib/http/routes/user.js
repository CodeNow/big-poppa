'use strict'

const Promise = require('bluebird')
const express = require('express')
const Joi = Promise.promisifyAll(require('joi'))

const BaseRouter = require('http/routes/base')
const User = require('models/user')

module.exports = class UserRouter extends BaseRouter {

  static router () {
    const router = express.Router()
    router.get('/:id', UserRouter.get)
    return router
  }

  static get (rawRequest, res) {
    const schema = Joi.object({
      params: Joi.object({
        id: Joi.number().required()
      }).unknown().required()
    }).unknown()

    return Joi.validateAsync(rawRequest, schema, { stripUnknown: true })
      .then(req => {
        return User.fetchById(req.params.id)
          .then(org => res.json(org.toJSON))
      })
      .catch(UserRouter.errorHandler.bind(UserRouter, rawRequest, res))
  }

}
