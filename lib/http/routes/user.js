'use strict'

const Promise = require('bluebird')
const express = require('express')
const Joi = Promise.promisifyAll(require('joi'))

const BaseRouter = require('http/routes/base')
const User = require('models/user')

module.exports = class UserRouter extends BaseRouter {

  static router () {
    const router = express.Router()
    router.get('/', UserRouter.get)
    router.get('/:id', UserRouter.getOne)
    return router
  }

  /**
   * Get a single `Organization`
   */
  static get (rawRequest, res) {
    const schema = Joi.object({
      query: Joi.object({
        github_id: Joi.number().required()
      }).unknown().required()
    }).unknown()

    return Joi.validateAsync(rawRequest, schema, { stripUnknown: true })
      .then(req => {
        return User.collection()
          .query({ where: req.query }).fetch()
          .then(user => res.json(user.toJSON()))
      })
      .catch(UserRouter.errorHandler.bind(UserRouter, rawRequest, res))
  }

  static getOne (rawRequest, res) {
    const schema = Joi.object({
      params: Joi.object({
        id: Joi.number().required()
      }).unknown().required()
    }).unknown()

    return Joi.validateAsync(rawRequest, schema, { stripUnknown: true })
      .then(req => {
        return User.fetchById(req.params.id)
          .then(user => res.json(user.toJSON()))
      })
      .catch(UserRouter.errorHandler.bind(UserRouter, rawRequest, res))
  }

}
