'use strict'

const Promise = require('bluebird')
const express = require('express')
const Joi = Promise.promisifyAll(require('joi'))
const moment = require('moment')

const BaseRouter = require('http/routes/base')
const Organization = require('models/organization')
const User = require('models/user')

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
    router.patch('/:id/add/', OrganizationRouter.createRoute(OrganizationRouter.addUser, OrganizationRouter.addUserSchema))
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
      .then(orgs => orgs.toJSON())
      .map(OrganizationRouter.tranformSingleOrg)
      .then(orgs => res.json(orgs))
  }

  /**
   * Tranform an org model instance into a format we can display through the
   * JSON API
   *
   * @param {Object}    org - Organization model instance
   * @returns {Object}      - Organization model instance
   */
  static tranformSingleOrg (org) {
    let now = moment()
    let trialEnd = moment(org.trialEnd)
    let activePeriodEnd = moment(org.activePeriodEnd)
    /**
     * Grace periods are updated automatically through a trigger in the DB
     * These are set to 72 hours after either the trial end or grace period end
     * when either of these are updated
     */
    let gracePeriodEnd = moment(org.gracePeriodEnd)
    return Object.assign({}, org, {
      // Convert ISO 8601 to Unix timestamps
      trialEnd: trialEnd.format('X'),
      activePeriodEnd: activePeriodEnd.format('X'),
      gracePeriodEnd: gracePeriodEnd.format('X'),
      // Provide booleans for whether orgs are active
      isPastTrial: trialEnd.isAfter(now),
      isPastActivePeriod: activePeriodEnd.isAfter(now),
      isPastGracePeriod: gracePeriodEnd.isAfter(now),
      allowed: org.isActive && (trialEnd.isAfter(now) || activePeriodEnd.isAfter(now))
    })
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
      .then(org => org.toJSON())
      .then(OrganizationRouter.tranformSingleOrg)
      .then(org => res.json(org))
  }

  /**
   * Modify a single `Organization` by its ID
   *
   * @param {Object}           validatedReq           - Validated request against `getSchema`
   * @param {Object}           validatedReq.params    - Parameters passed in URL
   * @param {Number}           validatedReq.params.id - Organization model instance ID
   * @param {Object}           validatedReq.body      - Body of request with modifications to model
   * @resolves {Organization}                         - An Organization model instances
   * @return {Promise}
   */
  static patchOne (validatedReq, res) {
    return Organization.fetchById(validatedReq.params.id)
      .then(org => org.save(validatedReq.body))
      .then(org => org.toJSON())
      .then(OrganizationRouter.tranformSingleOrg)
      .then(org => res.json(org))
  }

  /**
   * Add a User to the given Organization
   *
   * @param {Object}           validatedReq           - Validated request against `getSchema`
   * @param {Object}           validatedReq.params    - Parameters passed in URL
   * @param {Number}           validatedReq.params.id - Organization Model PostGres ID
   * @param {Object}           validatedReq.body      - Body of request with modifications to model
   * @param {Number}           validatedReq.body.id   - User Model PostGres ID
   *
   * @resolves {Organization} The given org, updated with the new association (if successful)
   * @throws   {NotFoundError} if the org or user could not be found
   * @throws   {UniqueError}   if the user is already attached to the org
   */
  static addUser (validatedReq, res) {
    return Promise.props({
      org: Organization.fetchById(validatedReq.params.id),
      user: User.fetchById(validatedReq.body.user.id)
    })
      .tap(result => result.org.addUser(result.user))
      .then(result => result.org.fetch({ withRelated: 'users' }))
      .then(org => org.toJSON())
      .then(OrganizationRouter.tranformSingleOrg)
      .then(org => res.json(org))
  }
}

OrganizationRouter.getSchema = Joi.object({
  query: Joi.object({
    githubId: Joi.number(),
    lowerName: Joi.string()
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

OrganizationRouter.addUserSchema = Joi.object({
  params: Joi.object({
    id: Joi.number().required()
  }).unknown().required(),
  body: Joi.object({
    user: Joi.object({
      id: Joi.number()
    }).required()
  }).required()
}).unknown()

module.exports = OrganizationRouter
