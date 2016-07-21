'use strict'

const Promise = require('bluebird')
const express = require('express')
const Joi = Promise.promisifyAll(require('joi'))

const BaseRouter = require('http/routes/base')
const Organization = require('models/organization')

class OrganizationRouter extends BaseRouter {

  /**
   * Generate an express router based on the router class
   *
   * @returns {Object} - An newly generated express router
   */
  static router () {
    const router = express.Router()
    router.get('/', OrganizationRouter.createRoute(OrganizationRouter.get, OrganizationRouter.getSchema))
    router.get('/:id', OrganizationRouter.createRoute(OrganizationRouter.getOne, OrganizationRouter.getOneSchema))
    router.patch('/:id', OrganizationRouter.createRoute(OrganizationRouter.patchOne, OrganizationRouter.patchSchema))
    return router
  }

  /**
   * Get all `Organization`s queried by different properties
   *
   * @param {Object}                  validatedReq                 - Validated request against `getSchema`
   * @param {Object}                  validatedReq.query           - Request query object
   * @param {Number}                  validatedReq.query.githubId - GH ID for organization
   * @param {Object}                  res                          - Express response object
   * @resloves {Array<Organization>}                               - An array of Organization model instances
   * @return {Promise}
   */
  static get (validatedReq, res) {
    let query = Organization.forge().format(validatedReq.query)
    return Organization.collection()
      .query({ where: query }).fetch({ withRelated: 'users' })
      .then(orgs => res.json(orgs.toJSON()))
  }

  /**
   * Get a single `Organization`
   *
   * @param {Object}           validatedReq           - Validated request against `getSchema`
   * @param {Object}           validatedReq.params    - Parameters passed in URL
   * @param {Number}           validatedReq.params.id - Organization model instance ID
   * @resloves {Organization}                         - An Organization model instances
   * @return {Promise}
   */
  static getOne (validatedReq, res) {
    return Organization.fetchById(validatedReq.params.id, { withRelated: 'users' })
      .then(org => res.json(org.toJSON()))
  }

  /**
   * Modify a single `Organization` by its ID
   *
   * @param {Object}           validatedReq           - Validated request against `getSchema`
   * @param {Object}           validatedReq.params    - Parameters passed in URL
   * @param {Number}           validatedReq.params.id - Organization model instance ID
   * @param {Object}           validatedReq.body      - Body of request with modifications to model
   * @resloves {Organization}                         - An Organization model instances
   * @return {Promise}
   */
  static patchOne (validatedReq, res) {
    return Organization.fetchById(validatedReq.params.id)
      .then(org => org.save(validatedReq.body))
      .then(org => res.json(org.toJSON()))
  }
}

OrganizationRouter.getSchema = Joi.object({
  query: Joi.object({
    githubId: Joi.number().required()
  }).unknown().required()
}).unknown()

OrganizationRouter.getOneSchema = Joi.object({
  params: Joi.object({
    id: Joi.number().required()
  }).unknown().required()
}).unknown()

OrganizationRouter.patchSchema = Joi.object({
  params: Joi.object({
    id: Joi.number().required()
  }).unknown().required(),
  body: Joi.object({
    githubId: Joi.number(),
    stripeCustomerId: Joi.number(),
    trialEnd: Joi.date().timestamp('unix'),
    activePeriodEnd: Joi.date().timestamp('unix'),
    gracePeriodEnd: Joi.date().timestamp('unix')
  }).required()
}).unknown()

module.exports = OrganizationRouter
