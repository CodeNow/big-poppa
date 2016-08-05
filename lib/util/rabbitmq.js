'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))

const RabbitMQClient = require('ponos/lib/rabbitmq')

class RabbitMQ {

  constructor () {
    this._rabbit = new RabbitMQClient({
      name: process.env.APP_NAME,
      hostname: process.env.RABBITMQ_HOSTNAME,
      port: process.env.RABBITMQ_PORT,
      username: process.env.RABBITMQ_USERNAME,
      password: process.env.RABBITMQ_PASSWORD
    })
  }

  connect () {
    return this._rabbit.connect()
  }

  disconnect () {
    return this._rabbit.disconnect()
  }

  publishASGCreate (rawJob) {
    return Joi.validateAsync(rawJob, RabbitMQ.publishASGCreateSchema)
      .then(job => this._rabbit.publishTask('asg.create', job))
  }

  publishOrganizationCreated (rawJob) {
    return Joi.validateAsync(rawJob, RabbitMQ.publishOrganizationCreated)
      .then(job => this._rabbit.publishEvent('organization.created', job))
  }

  publishUserAddedToOrganization (rawJob) {
    return Joi.validateAsync(rawJob, RabbitMQ.publishUserAddedOrRemovedSchema)
      .then(job => this._rabbit.publishEvent('organization.user.added', job))
  }

  publishUserRemovedFromOrganization (rawJob) {
    return Joi.validateAsync(rawJob, RabbitMQ.publishUserAddedOrRemovedSchema)
      .then(job => this._rabbit.publishEvent('organization.user.removed', job))
  }

}

RabbitMQ.publishASGCreateSchema = Joi.object({
  githubId: Joi.number().required()
})

RabbitMQ.publishOrganizationCreated = Joi.object({
  githubId: Joi.number().required(),
  organizationName: Joi.string().required(),
  organizationId: Joi.number().required(),
  createdAt: Joi.date().timestamp('unix').required()
})

RabbitMQ.publishUserAddedOrRemovedSchema = Joi.object({
  organizationId: Joi.number().required(),
  organizationGithubId: Joi.number().required(),
  userId: Joi.number().required(),
  userGithubId: Joi.number().required()
})

module.exports = new RabbitMQ()
