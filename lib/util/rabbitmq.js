'use strict'
const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))

const RabbitMQClient = require('ponos/lib/rabbitmq')

class RabbitMQ extends RabbitMQClient {

  constructor () {
    super({
      name: process.env.APP_NAME,
      hostname: process.env.RABBITMQ_HOSTNAME,
      port: process.env.RABBITMQ_PORT,
      username: process.env.RABBITMQ_USERNAME,
      password: process.env.RABBITMQ_PASSWORD,
      tasks: [{
        name: 'organization.user.add',
        jobSchema: RabbitMQ.publishOrganizationUserAddSchema
      }],
      events: [{
        name: 'organization.created',
        jobSchema: RabbitMQ.publishOrganizationCreated
      }, {
        name: 'organization.user.added',
        jobSchema: RabbitMQ.publishUserAddedOrRemovedSchema
      }, {
        name: 'organization.user.removed',
        jobSchema: RabbitMQ.publishUserAddedOrRemovedSchema
      }]
    })
  }
}

RabbitMQ.publishOrganizationUserAddSchema = Joi.object({
  tid: Joi.string().guid(),
  organizationGithubId: Joi.number().required(),
  userGithubId: Joi.number().required()
}).required()

RabbitMQ.publishOrganizationCreated = Joi.object({
  organization: Joi.object({
    id: Joi.number().required(),
    githubId: Joi.number().required(),
    name: Joi.string().required()
  }).required(),
  creator: Joi.object({
    githubId: Joi.number().required(),
    githubUsername: Joi.string().required()
  }).unknown().required(),
  createdAt: Joi.date().iso().required()
}).required()

RabbitMQ.publishUserAddedOrRemovedSchema = Joi.object({
  organization: Joi.object({
    id: Joi.number().required(),
    githubId: Joi.number().required()
  }).required(),
  user: Joi.object({
    id: Joi.number().required(),
    githubId: Joi.number().required()
  }).required()
}).required()

module.exports = new RabbitMQ()
