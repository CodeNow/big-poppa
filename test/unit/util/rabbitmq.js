'use strict'

const Promise = require('bluebird')
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const expect = require('chai').expect

const Joi = require('joi')
const RabbitMQClient = require('ponos/lib/rabbitmq')
const rabbitMQInstance = require('util/rabbitmq')

describe('RabbitMQ', () => {
  let validateSpy
  let connectStub
  let disconnectStub
  let rabbitMQ

  beforeEach(() => {
    validateSpy = sinon.spy(Joi, 'validate')
    connectStub = sinon.stub(RabbitMQClient.prototype, 'connect').resolves()
    disconnectStub = sinon.stub(RabbitMQClient.prototype, 'disconnect').resolves()
  })

  afterEach(() => {
    validateSpy.restore()
    connectStub.restore()
    disconnectStub.restore()
  })

  beforeEach(() => {
    rabbitMQ = new rabbitMQInstance.constructor()
  })

  describe('constructor', () => {
    it('should have a `_rabbit` property', () => {
      expect(rabbitMQ).to.be.an.object
      expect(rabbitMQ.publishTask).to.be.a.function
      expect(rabbitMQ.publishEvent).to.be.a.function
      expect(rabbitMQ.connect).to.be.a.function
      expect(rabbitMQ.disconnect).to.be.a.function
    })
  })
})
