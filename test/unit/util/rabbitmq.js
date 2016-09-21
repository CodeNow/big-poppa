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
      expect(rabbitMQ._rabbit).to.be.an.object
      expect(rabbitMQ._rabbit.publishTask).to.be.a.function
    })
  })

  describe('connect', () => {
    it('should connect to the rabbit server', () => {
      return rabbitMQ.connect()
        .then(() => {
          sinon.assert.calledOnce(connectStub)
        })
    })

    it('should return an error if `connect` returns an error', done => {
      let originalErr = new Error('Error connecting')
      connectStub.rejects(originalErr)
      rabbitMQ.connect()
        .asCallback(err => {
          sinon.assert.calledOnce(connectStub)
          expect(err).to.exist
          expect(err).to.equal(originalErr)
          done()
        })
    })
  })

  describe('disconnect', () => {
    it('should disconnect from the rabbit server', () => {
      return rabbitMQ.disconnect()
        .then(() => {
          sinon.assert.calledOnce(disconnectStub)
        })
    })

    it('should return an error if `disconnect` returns an error', done => {
      let originalErr = new Error('Error disconnecting')
      disconnectStub.rejects(originalErr)
      rabbitMQ.disconnect()
        .asCallback(err => {
          sinon.assert.calledOnce(disconnectStub)
          expect(err).to.exist
          expect(err).to.equal(originalErr)
          done()
        })
    })
  })
})
