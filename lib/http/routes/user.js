'use strict'

const Promise = require('bluebird')
const express = require('express')
const Joi = Promise.promisifyAll(require('joi'))

const BaseRouter = require('http/routes/base')
const User = require('models/user')

const getSchema = Joi.object({
  query: Joi.object({
    github_id: Joi.number().required()
  }).unknown().required()
}).unknown()

const getOneSchema = Joi.object({
  params: Joi.object({
    id: Joi.number().required()
  }).unknown().required()
}).unknown()

module.exports = class UserRouter extends BaseRouter {

  static router () {
    const router = express.Router()
    router.get('/', UserRouter.createRoute(UserRouter.get, getSchema))
    router.get('/:id', UserRouter.createRoute(UserRouter.getOne, getOneSchema))
    return router
  }

  /**
   * Get a single `Organization`
   */
  static get (validatedReq, res) {
    return User.collection()
      .query({ where: validatedReq.query }).fetch({ withRelated: 'organizations' })
      .then(user => res.json(user.toJSON()))
  }

  static getOne (validatedReq, res) {
    return User.fetchById(validatedReq.params.id, { withRelated: 'organizations' })
      .then(user => res.json(user.toJSON()))
  }

}
