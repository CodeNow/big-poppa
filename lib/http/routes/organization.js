'use strict'

const Promise = require('bluebird')
const express = require('express')
const Joi = Promise.promisifyAll(require('joi'))
const moment = require('moment')
const Bookshelf = require('models').bookshelf

const BaseRouter = require('http/routes/base')
const QueryBuilder = require('util/query-builder')
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
    return Organization.collection()
      .query(qb => QueryBuilder.generate(validatedReq.query, qb))
      .fetch({ withRelated: Organization.withRelatedProps })
      .then(orgs => orgs.toJSON())
      .map(OrganizationRouter.transformSingleOrg)
      .map(OrganizationRouter.removeUserAccessTokens)
      .then(orgs => res.json(orgs))
  }

  /**
   * Tranform an org model instance into a format we can display through the
   * JSON API
   *
   * @param {Object}    org - Organization model instance
   * @returns {Object}      - Organization model instance
   */
  static transformSingleOrg (org) {
    let outputOrg = {}
    let now = moment()
    let trialEnd = moment(org.trialEnd)
    let activePeriodEnd = moment(org.activePeriodEnd)
    /**
     * Grace periods are updated automatically through a trigger in the DB
     * These are set to 72 hours after either the trial end or grace period end
     * when either of these are updated
     */
    let gracePeriodEnd = moment(org.gracePeriodEnd)
    Object.assign(outputOrg, org, {
      // Format as ISO 8601 timestamps
      trialEnd: trialEnd.toISOString(),
      activePeriodEnd: activePeriodEnd.toISOString(),
      gracePeriodEnd: gracePeriodEnd.toISOString(),
      // Provide booleans for whether orgs are active
      isInTrial: trialEnd.isAfter(now),
      isInActivePeriod: activePeriodEnd.isAfter(now)
    })
    return Object.assign(outputOrg, {
      isInGracePeriod: !(outputOrg.isInTrial || outputOrg.isInActivePeriod) && gracePeriodEnd.isAfter(now),
      // If they are in the grace period, allow them to do everything
      // Only thing users should not be able to do is enter the UI
      allowed: outputOrg.isActive && (outputOrg.isInTrial || outputOrg.isInActivePeriod || gracePeriodEnd.isAfter(now))
    })
  }

  /**
   * send a response to user consisting of the organization
   *
   * @param {Object}            Organization                 - An Organization model instance to be formatted
   * @resolves {Organization}                                - An Organization model instance
   * @return {Promise}
   */
  static sendOrgResponse (org, res) {
    return Promise.resolve(org)
      .then((org) => org.toJSON())
      .then(OrganizationRouter.transformSingleOrg)
      .then(OrganizationRouter.removeUserAccessTokens)
      .then(org => res.json(org))
  }

  /**
   * removes the accessTokens from the user models in the org
   *
   * @param  {Object}    org - Organization model instance
   * @returns {Object}       - Organization model instance
   */
  static removeUserAccessTokens (org) {
    if (!org.users) return org
    org.users.map(user => {
      delete user.accessToken
      return user
    })
    return org
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
    return Organization.fetchById(validatedReq.params.id, { withRelated: Organization.withRelatedProps })
      .then(org => OrganizationRouter.sendOrgResponse(org, res))
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
    return Bookshelf.transaction(function (transacting) {
      return Organization.fetchById(validatedReq.params.id, { transacting: transacting, forUpdate: true })
      .then(org => {
        org.on('saving', (model, attrs, opts) => {
          res.set('Model-Updates', JSON.stringify(model.changed))
        })
        if (validatedReq.body.metadata) {
          validatedReq.body.metadata = Object.assign(org.attributes.metadata || {}, validatedReq.body.metadata)
        }
        return org.save(validatedReq.body, { transacting: transacting, patch: true })
      })
      // Re-fetch org in order to apply any database triggers
      .then(() => Organization.fetchById(validatedReq.params.id, { transacting: transacting }))
    })
      .then(org => OrganizationRouter.sendOrgResponse(org, res))
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
      .then(result => result.org.fetch({ withRelated: Organization.withRelatedProps }))
      .then(org => OrganizationRouter.sendOrgResponse(org, res))
  }
}

const queryObjectSchema = Joi.object({
  lessThan: Joi.date().iso(),
  moreThan: Joi.date().iso(),
  isNull: Joi.boolean()
}).required()

OrganizationRouter.getSchema = Joi.object({
  query: Joi.object({
    firstDockCreated: Joi.boolean(),
    githubId: Joi.number(),
    hasPaymentMethod: Joi.boolean(),
    isActive: Joi.boolean(),
    lowerName: Joi.string(),
    name: Joi.string(),
    stripeCustomerId: Joi.alternatives().try(Joi.string(), queryObjectSchema),
    stripeSubscriptionId: Joi.alternatives().try(Joi.string(), queryObjectSchema),
    trialEnd: Joi.alternatives().try(Joi.string(), queryObjectSchema),
    activePeriodEnd: Joi.alternatives().try(Joi.string(), queryObjectSchema),
    gracePeriodEnd: Joi.alternatives().try(Joi.string(), queryObjectSchema)
  })
}).unknown()

OrganizationRouter.getOneSchema = Joi.object({
  params: Joi.object({
    id: Joi.number().required()
  }).required()
}).unknown()

OrganizationRouter.patchSchema = Joi.object({
  params: Joi.object({
    id: Joi.number().required()
  }).unknown().required(),
  body: Joi.object({
    activePeriodEnd: Joi.date().iso(),
    firstDockCreated: Joi.boolean(),
    githubId: Joi.number(),
    gracePeriodEnd: Joi.date().iso(),
    hasPaymentMethod: Joi.boolean(),
    isActive: Joi.boolean(),
    metadata: Joi.object({
      hasAha: Joi.boolean(),
      hasConfirmedSetup: Joi.boolean()
    }),
    prBotEnabled: Joi.boolean(),
    stripeCustomerId: Joi.string(),
    stripeSubscriptionId: Joi.string(),
    trialEnd: Joi.date().iso()
  }).required()
}).unknown()

OrganizationRouter.addUserSchema = Joi.object({
  params: Joi.object({
    id: Joi.number().required()
  }).required(),
  body: Joi.object({
    user: Joi.object({
      id: Joi.number()
    }).required()
  }).required()
}).unknown()

module.exports = OrganizationRouter
