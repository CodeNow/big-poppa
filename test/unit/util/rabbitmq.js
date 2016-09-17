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
  let publishEventStub
  let rabbitMQ

  beforeEach(() => {
    validateSpy = sinon.spy(Joi, 'validate')
    connectStub = sinon.stub(RabbitMQClient.prototype, 'connect').resolves()
    disconnectStub = sinon.stub(RabbitMQClient.prototype, 'disconnect').resolves()
    publishTaskStub = sinon.stub(RabbitMQClient.prototype, 'publishTask')
    publishEventStub = sinon.stub(RabbitMQClient.prototype, 'publishEvent')
  })

  afterEach(() => {
    validateSpy.restore()
    connectStub.restore()
    disconnectStub.restore()
    publishTaskStub.restore()
    publishEventStub.restore()
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
    let userGithubId = 1981198
    let orgId = 897
    let orgName = 'CodeNow'
    let createdAt = new Date('2016-07-21T21:22:42+0000')
    let validJob

    beforeEach(() => {
      validJob = {
        organization: {
          id: orgId,
          githubId: githubId,
          name: orgName
        },
        creator: {
          githubId: userGithubId
        },
        createdAt: createdAt
      }
    })

    describe('Validation', () => {
      it('shoud required a `githubId` property', done => {
        delete validJob.organization.githubId
        rabbitMQ.publishOrganizationCreated(validJob)
          .asCallback(err => {
            expect(err).to.exist
            expect(err.message).to.match(/githubid/i)
            done()
          })
      })

      it('shoud required a `name` property', done => {
        delete validJob.organization.name
        rabbitMQ.publishOrganizationCreated(validJob)
          .asCallback(err => {
            expect(err).to.exist
            expect(err.message).to.match(/name/i)
            done()
          })
      })

      it('shoud required a `createdAt` property', done => {
        delete validJob.createdAt
        rabbitMQ.publishOrganizationCreated(validJob)
          .asCallback(err => {
            expect(err).to.exist
            expect(err.message).to.match(/createdAt/i)
            done()
          })
      })

      it('shoud required a `creator.githubId` property', done => {
        delete validJob.creator.githubId
        rabbitMQ.publishOrganizationCreated(validJob)
          .asCallback(err => {
            expect(err).to.exist
            expect(err.message).to.match(/githubId/i)
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
          sinon.assert.calledOnce(publishEventStub)
          sinon.assert.calledWithExactly(
            publishEventStub,
            'organization.created',
            validJob
          )
        })
    })
  })

  describe('publishUserAddedToOrganization', () => {
    let orgGithubId = 4567
    let orgId = 897
    let userGithubId = 23423
    let userId = 8007
    let validJob

    beforeEach(() => {
      validJob = {
        organization: {
          id: orgId,
          githubId: orgGithubId
        },
        user: {
          id: userId,
          githubId: userGithubId
        }
      }
    })

    describe('Validation', () => {
      it('shoud required a `organization.githubId` property', done => {
        delete validJob.organization.githubId
        rabbitMQ.publishUserAddedToOrganization(validJob)
          .asCallback(err => {
            expect(err).to.exist
            expect(err.message).to.match(/githubid/i)
            done()
          })
      })

      it('shoud required a `organization.id` property', done => {
        delete validJob.organization.id
        rabbitMQ.publishUserAddedToOrganization(validJob)
          .asCallback(err => {
            expect(err).to.exist
            expect(err.message).to.match(/id/i)
            done()
          })
      })

      it('shoud required a `user` property', done => {
        delete validJob.user
        rabbitMQ.publishUserAddedToOrganization(validJob)
          .asCallback(err => {
            expect(err).to.exist
            expect(err.message).to.match(/user/i)
            done()
          })
      })

      it('should resolve promise if job is valid', () => {
        return rabbitMQ.publishUserAddedToOrganization(validJob)
      })
    })

    it('should publish the task', () => {
      return rabbitMQ.publishUserAddedToOrganization(validJob)
        .then(() => {
          sinon.assert.calledOnce(publishEventStub)
          sinon.assert.calledWithExactly(
            publishEventStub,
            'organization.user.added',
            validJob
          )
        })
    })
  })

  describe('publishUserRemovedFromOrganization', () => {
    let orgGithubId = 4567
    let orgId = 897
    let userGithubId = 23423
    let userId = 8007
    let validJob

    beforeEach(() => {
      validJob = {
        organization: {
          id: orgId,
          githubId: orgGithubId
        },
        user: {
          id: userId,
          githubId: userGithubId
        }
      }
    })

    describe('Validation', () => {
      it('shoud required a `organization.githubId` property', done => {
        delete validJob.organization.githubId
        rabbitMQ.publishUserRemovedFromOrganization(validJob)
          .asCallback(err => {
            expect(err).to.exist
            expect(err.message).to.match(/githubid/i)
            done()
          })
      })

      it('shoud required a `organization.id` property', done => {
        delete validJob.organization.id
        rabbitMQ.publishUserRemovedFromOrganization(validJob)
          .asCallback(err => {
            expect(err).to.exist
            expect(err.message).to.match(/id/i)
            done()
          })
      })

      it('shoud required a `user` property', done => {
        delete validJob.user
        rabbitMQ.publishUserRemovedFromOrganization(validJob)
          .asCallback(err => {
            expect(err).to.exist
            expect(err.message).to.match(/user/i)
            done()
          })
      })

      it('should resolve promise if job is valid', () => {
        return rabbitMQ.publishUserRemovedFromOrganization(validJob)
      })
    })

    it('should publish the task', () => {
      return rabbitMQ.publishUserRemovedFromOrganization(validJob)
        .then(() => {
          sinon.assert.calledOnce(publishEventStub)
          sinon.assert.calledWithExactly(
            publishEventStub,
            'organization.user.removed',
            validJob
          )
        })
    })
  })
})
