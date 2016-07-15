'use strict'

const Promise = require('bluebird')
const express = require('express')
const Joi = Promise.promisifyAll(require('joi'))

const BaseRouter = require('http/routes/base')
const Organization = require('models/organization')

module.exports = class OrganizationRouter extends BaseRouter {

  static router () {
    const router = express.Router()
    router.get('/:id', OrganizationRouter.get)
    router.patch('/:id', OrganizationRouter.patch)
    return router
  }

  /**
   * Get a single `Organization`
   */
  static get (rawRequest, res) {
    const schema = Joi.object({
      params: Joi.object({
        id: Joi.number().required()
      }).unknown().required()
    }).unknown()

    return Joi.validateAsync(rawRequest, schema, { stripUnknown: true })
      .then(req => {
        return Organization.fetchById(req.params.id)
          .then(org => res.json(org.toJSON))
      })
      .catch(OrganizationRouter.errorHandler.bind(OrganizationRouter, rawRequest, res))
  }

  static patch (rawRequest, res) {
    const schema = Joi.object({
      params: Joi.object({
        id: Joi.number().required()
      }).unknown().required(),
      body: Joi.object({
        github_id: Joi.number(),
        stripe_customer_id: Joi.number(),
        trial_end: Joi.date().timestamp('unix'),
        active_period_end: Joi.date().timestamp('unix'),
        grace_period_end: Joi.date().timestamp('unix')
      }).required()
    }).unknown()

    return Joi.validateAsync(rawRequest, schema)
      .then(req => {
        return Organization.fetchById(req.params.id)
          .then(org => {
            return org.save(req.body)
          })
          .then(org => res.json(org.toJSON))
      })
      .catch(OrganizationRouter.errorHandler.bind(OrganizationRouter, rawRequest, res))
  }
}

