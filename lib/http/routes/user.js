'use strict'

const Promise = require('bluebird')
const express = require('express')
const Joi = Promise.promisifyAll(require('joi'))

const BaseRouter = require('http/routes/base')
const User = require('models/user')

class UserRouter extends BaseRouter {

  /**
   * Generate an express router based on the router class
   *
   * @returns {Object} - An newly generated express router
   */
  static router () {
    const router = express.Router()
    router.get('/', UserRouter.createRoute(UserRouter.get, UserRouter.getSchema))
    router.get('/:id', UserRouter.createRoute(UserRouter.getOne, UserRouter.getOneSchema))
    return router
  }

  /**
   * Get all `User`s queried by different properties
   *
   * @param {Object}          validatedReq                 - Validated request against `getSchema`
   * @param {Object}          validatedReq.query           - Request query object
   * @param {Number}          validatedReq.query.github_id - GH ID for user
   * @resloves {Array<User>}                               - An array of User model instances
   * @return {Promise}
   */
  static get (validatedReq, res) {
    return User.collection()
      .query({ where: validatedReq.query }).fetch({ withRelated: 'organizations' })
      .then(users => res.json(users.toJSON()))
  }

  /**
   * Get a single `User`
   *
   * @param {Object}    validatedReq           - Validated request against `getSchema`
   * @param {Object}    validatedReq.params    - Parameters passed in URL
   * @param {Number}    validatedReq.params.id - User model instance ID
   * @resloves {User}                          - An User model instances
   * @return {Promise}
   */
  static getOne (validatedReq, res) {
    return User.fetchById(validatedReq.params.id, { withRelated: 'organizations' })
      .then(user => res.json(user.toJSON()))
  }
}

UserRouter.getSchema = Joi.object({
  query: Joi.object({
    github_id: Joi.number().required()
  }).unknown().required()
}).unknown()

UserRouter.getOneSchema = Joi.object({
  params: Joi.object({
    id: Joi.number().required()
  }).unknown().required()
}).unknown()

module.exports = UserRouter
