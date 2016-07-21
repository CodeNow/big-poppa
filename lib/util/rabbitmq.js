'use strict'

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
    return this._rabbit.connect()
  }

  publishASGCreate () {
  }

  publishOrganizationCreated () {
  }

}

module.exports = new RabbitMQ()
