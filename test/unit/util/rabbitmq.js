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
  let publishTaskStub
  let rabbitMQ

  beforeEach(() => {
    validateSpy = sinon.spy(Joi, 'validate')
    connectStub = sinon.stub(RabbitMQClient.prototype, 'connect').resolves()
    disconnectStub = sinon.stub(RabbitMQClient.prototype, 'disconnect').resolves()
    publishTaskStub = sinon.stub(RabbitMQClient.prototype, 'publishTask')
  })

  afterEach(() => {
    validateSpy.restore()
    connectStub.restore()
    disconnectStub.restore()
    publishTaskStub.restore()
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

  describe('publishASGCreate', () => {
    let githubId
    let validJob

    beforeEach(() => {
      githubId = 4567
      validJob = { githubId: githubId }
    })

    describe('Validation', () => {
      it('shoud required a `githubId` property', done => {
        rabbitMQ.publishASGCreate({ notGithub: 23423 })
          .asCallback(err => {
            expect(err).to.exist
            expect(err.message).to.match(/githubid/i)
            done()
          })
      })

      it('shoud required the `githubId` property to be a number', done => {
        rabbitMQ.publishASGCreate({ githubId: 'asfa234' })
          .asCallback(err => {
            expect(err).to.exist
            expect(err.message).to.match(/githubid/i)
            done()
          })
      })

      it('should resolve promise if job is valid', () => {
        return rabbitMQ.publishASGCreate(validJob)
      })
    })

    it('should publish the task', () => {
      return rabbitMQ.publishASGCreate(validJob)
        .then(() => {
          sinon.assert.calledOnce(publishTaskStub)
          sinon.assert.calledWithExactly(
            publishTaskStub,
            'asg.create',
            validJob
          )
        })
    })
  })

  describe('publishOrganizationCreated', () => {
    let githubId = 4567
    let orgName = 'CodeNow'
    let createdAt = '1469207585'
    let validJob

    beforeEach(() => {
      validJob = {
        githubId: githubId,
        orgName: orgName,
        createdAt: createdAt
      }
    })

    describe('Validation', () => {
      it('shoud required a `githubId` property', done => {
        rabbitMQ.publishOrganizationCreated({ orgName: orgName, createdAt: createdAt })
          .asCallback(err => {
            expect(err).to.exist
            expect(err.message).to.match(/githubid/i)
            done()
          })
      })

      it('shoud required a `orgName` property', done => {
        rabbitMQ.publishOrganizationCreated({ githubId: githubId, createdAt: createdAt })
          .asCallback(err => {
            expect(err).to.exist
            expect(err.message).to.match(/orgName/i)
            done()
          })
      })

      it('shoud required a `createdAt` property', done => {
        rabbitMQ.publishOrganizationCreated({ githubId: githubId, orgName: orgName })
          .asCallback(err => {
            expect(err).to.exist
            expect(err.message).to.match(/createdAt/i)
            done()
          })
      })

      it('should resolve promise if job is valid', () => {
        return rabbitMQ.publishOrganizationCreated(validJob)
      })
    })

    it('should publish the task', () => {
      return rabbitMQ.publishOrganizationCreated(validJob)
        .then(() => {
          sinon.assert.calledOnce(publishTaskStub)
          sinon.assert.calledWithExactly(
            publishTaskStub,
            'organization.created',
            validJob
          )
        })
    })
  })
})
