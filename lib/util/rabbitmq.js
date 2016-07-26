'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))
const moment = require('moment')

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
      .then(job => Object.assign(job, { createdAt: moment(job.createdAt).format('X') }))
      .then(job => this._rabbit.publishTask('organization.created', job))
  }

}

RabbitMQ.publishASGCreateSchema = Joi.object({
  githubId: Joi.number().required()
})

RabbitMQ.publishOrganizationCreated = Joi.object({
  githubId: Joi.number().required(),
  orgName: Joi.string().required(),
  createdAt: Joi.date().timestamp('unix').required()
})

module.exports = new RabbitMQ()
