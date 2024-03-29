'use strict'

const Promise = require('bluebird')
const express = require('express')
const Joi = Promise.promisifyAll(require('joi'))

const BaseRouter = require('http/routes/base')
const QueryBuilder = require('util/query-builder')
const OrganizationRouter = require('http/routes/organization')
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
    router.post('/', UserRouter.createRoute(UserRouter.updateOrCreate, UserRouter.updateOrCreateSchema))
    return router
  }

  /**
   * Get all `User`s queried by different properties
   *
   * @param {Object}          validatedReq                 - Validated request against `getSchema`
   * @param {Object}          validatedReq.query           - Request query object
   * @param {Number}          validatedReq.query.githubId - GH ID for user
   * @resloves {Array<User>}                               - An array of User model instances
   * @return {Promise}
   */
  static get (validatedReq, res) {
    return User.collection(validatedReq.query)
      .query(qb => QueryBuilder.generate(validatedReq.query, qb))
      .fetch({ withRelated: 'organizations' })
      .then(users => users.toJSON())
      .map(transformOrgsOnUser)
      .then(users => res.json(users))
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
      .then(user => user.toJSON())
      .then(transformOrgsOnUser)
      .then(user => res.json(user))
  }

  /**
   * Create or fetch a `User`
   * @param {Object} validatedReq - Validated request against `createUserSchema`
   * @param {Object} validatedReq.body - Request Body
   * @param {Number} validatedReq.body.githubId - Github ID
   * @param {String} validatedReq.body.accessToken - Github access token
   * @param {Object} res - Express response object
   * @resolves {User}
   * @returns {Promise}
   */
  static updateOrCreate (validatedReq, res) {
    return User.updateOrCreateByGithubId(validatedReq.body.githubId, validatedReq.body.accessToken)
      .tap(response => {
        if (response.updates) {
          res.set('Model-Updates', JSON.stringify(response.updates))
        }
      })
      .then(response => response.model.toJSON())
      .then(transformOrgsOnUser)
      .then(user => res.status(201).json(user))
  }
}

/**
 * Transforms all of the orgs in a user to have isAllowed and all that jazz
 *
 * @param {User} user - user model with orgs
 * @param {User} user.organizations - user orgs
 *
 * @returns {User} with the fixed orgs
 */
function transformOrgsOnUser (user) {
  if (!user.organizations) return user
  user.organizations = user.organizations.map(OrganizationRouter.transformSingleOrg)
  return user
}

UserRouter.getSchema = Joi.object({
  query: Joi.object({
    githubId: Joi.number().required()
  }).unknown().required()
}).unknown()

UserRouter.getOneSchema = Joi.object({
  params: Joi.object({
    id: Joi.number().required()
  }).unknown().required()
}).unknown()

UserRouter.updateOrCreateSchema = Joi.object({
  body: Joi.object({
    githubId: Joi.number().required(),
    accessToken: Joi.string().regex(/^[A-z0-9]*$/).required()
  }).unknown().required()
}).unknown()

module.exports = UserRouter
