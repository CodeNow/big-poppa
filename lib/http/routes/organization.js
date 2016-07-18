'use strict'

const Promise = require('bluebird')
const express = require('express')
const Joi = Promise.promisifyAll(require('joi'))

const BaseRouter = require('http/routes/base')
const Organization = require('models/organization')

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

const patchSchema = Joi.object({
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

module.exports = class OrganizationRouter extends BaseRouter {

  static router () {
    const router = express.Router()
    router.get('/', OrganizationRouter.get)
    router.get('/:id', OrganizationRouter.getOne)
    router.patch('/:id', OrganizationRouter.patchOne)
    return router
  }

  /**
   * Get a single `Organization`
   */
  static get (rawRequest, res) {
    return Joi.validateAsync(rawRequest, getSchema, { stripUnknown: true })
      .then(req => {
        return Organization.collection()
          .query({ where: req.query }).fetch()
          .then(org => res.json(org.toJSON()))
      })
      .catch(OrganizationRouter.errorHandler.bind(OrganizationRouter, rawRequest, res))
  }

  /**
   * Get a single `Organization`
   */
  static getOne (rawRequest, res) {
    return Joi.validateAsync(rawRequest, getOneSchema, { stripUnknown: true })
      .then(req => {
        return Organization.fetchById(req.params.id)
          .then(org => res.json(org.toJSON()))
      })
      .catch(OrganizationRouter.errorHandler.bind(OrganizationRouter, rawRequest, res))
  }

  static patchOne (rawRequest, res) {
    return Joi.validateAsync(rawRequest, patchSchema)
      .then(req => {
        return Organization.fetchById(req.params.id)
          .then(org => org.save(req.body))
          .then(org => res.json(org.toJSON))
      })
      .catch(OrganizationRouter.errorHandler.bind(OrganizationRouter, rawRequest, res))
  }
}

