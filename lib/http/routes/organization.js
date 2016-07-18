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
    router.get('/', OrganizationRouter.createRoute(OrganizationRouter.get, getSchema))
    router.get('/:id', OrganizationRouter.createRoute(OrganizationRouter.getOne, getOneSchema))
    router.patch('/:id', OrganizationRouter.createRoute(OrganizationRouter.patchOne, patchSchema))
    return router
  }

  /**
   * Get a single `Organization`
   */
  static get (validatedReq, res) {
    return Organization.collection()
      .query({ where: validatedReq.query }).fetch({ withRelated: 'users' })
      .then(org => res.json(org.toJSON()))
  }

  /**
   * Get a single `Organization`
   */
  static getOne (validatedReq, res) {
    return Organization.fetchById(validatedReq.params.id, { withRelated: 'users' })
      .then(org => res.json(org.toJSON()))
  }

  static patchOne (validatedReq, res) {
    return Organization.fetchById(validatedReq.params.id)
      .then(org => org.save(validatedReq.body))
      .then(org => res.json(org.toJSON()))
  }
}

