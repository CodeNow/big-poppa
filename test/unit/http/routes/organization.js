'use strict'

const Promise = require('bluebird')
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const expect = require('chai').expect

const express = require('express')
const moment = require('moment')

const NotFoundError = require('errors/not-found-error')
const Organization = require('models/organization')
const User = require('models/user')
const OrganizationRouter = require('http/routes/organization')

describe('HTTP /organization', () => {
  let collectionConstructorStub
  let orgMock
  let userMock
  let orgMockJSON
  let responseStub
  let fetchByIdStub
  let userFetchByIdStub
  let requestStub
  let transformSingleOrgSpy

  beforeEach(() => {
    orgMockJSON = {
      id: 1,
      users: []
    }
    orgMock = {
      save: sinon.stub().returnsThis(),
      addUser: sinon.stub().returnsThis(),
      fetch: sinon.stub().returnsThis(),
      toJSON: sinon.stub().returns(orgMockJSON)
    }
    userMock = {
      save: sinon.stub().returnsThis(),
      toJSON: sinon.stub().returns(orgMockJSON)
    }
    fetchByIdStub = sinon.stub(Organization, 'fetchById').resolves(orgMock)
    transformSingleOrgSpy = sinon.spy(OrganizationRouter, 'transformSingleOrg')
    userFetchByIdStub = sinon.stub(User, 'fetchById').resolves(userMock)
    responseStub = {
      json: sinon.stub()
    }
  })

  afterEach(() => {
    fetchByIdStub.restore()
    userFetchByIdStub.restore()
    transformSingleOrgSpy.restore()
  })

  describe('#router', () => {
    it('should return an express router', () => {
      let router = OrganizationRouter.router()
      expect(router).to.be.an.instanceOf(express.Router().constructor)
    })
  })

  describe('transformSingleOrg', () => {
    let originalObject
    let now

    beforeEach(() => {
      now = moment()
      // Timestamp should be a string like this
      // '2016-07-21T17:47:24.161Z'
      originalObject = {
        isActive: true,
        trialEnd: now.toISOString(),
        activePeriodEnd: now.toISOString(),
        gracePeriodEnd: now.toISOString()
      }
    })

    it('should return the same object', () => {
      let obj = OrganizationRouter.transformSingleOrg(originalObject)
      expect(obj).to.not.equal(originalObject)
    })

    it('should transform `trialEnd`, `activePeriodEnd`, `gracePeriodEnd` to unix timestamps', () => {
      let obj = OrganizationRouter.transformSingleOrg(originalObject)
      expect(obj.trialEnd).to.equal(now.toISOString())
      expect(obj.activePeriodEnd).to.equal(now.toISOString())
      expect(obj.gracePeriodEnd).to.equal(now.toISOString())
    })

    it('should return `true` for `isInTrial`, `isInActivePeriod`, and `isInGracePeriod`if trial, active period and grace period have passed', () => {
      Object.assign(originalObject, {
        trialEnd: now.clone().add(1, 'minute').toISOString(),
        activePeriodEnd: now.clone().add(1, 'minute').toISOString(),
        gracePeriodEnd: now.clone().add(1, 'minute').toISOString()
      })
      let obj = OrganizationRouter.transformSingleOrg(originalObject)
      expect(obj.isInTrial).to.equal(true)
      expect(obj.isInActivePeriod).to.equal(true)
      expect(obj.isInGracePeriod).to.equal(false)
    })

    it('should return `false` for `isInTrial`, `isInActivePeriod`, and `is`if trial, active period and grace period have not passed', () => {
      Object.assign(originalObject, {
        trialEnd: now.clone().subtract(1, 'minute').toISOString(),
        activePeriodEnd: now.clone().subtract(1, 'minute').toISOString(),
        gracePeriodEnd: now.clone().subtract(1, 'minute').toISOString()
      })
      let obj = OrganizationRouter.transformSingleOrg(originalObject)
      expect(obj.isInTrial).to.equal(false)
      expect(obj.isInActivePeriod).to.equal(false)
      expect(obj.isInGracePeriod).to.equal(false)
    })

    it('should return `allowed` true if both `isInTrial` and `isInActivePeriod` are true', () => {
      Object.assign(originalObject, {
        trialEnd: now.clone().add(1, 'minute').toISOString(),
        activePeriodEnd: now.clone().add(1, 'minute').toISOString()
      })
      let obj = OrganizationRouter.transformSingleOrg(originalObject)
      expect(obj.isInTrial).to.equal(true)
      expect(obj.isInActivePeriod).to.equal(true)
      expect(obj.allowed).to.equal(true)
    })

    it('should return `allowed` true if both `isInTrial` is true', () => {
      Object.assign(originalObject, {
        trialEnd: now.clone().add(1, 'minute').toISOString(),
        activePeriodEnd: now.clone().subtract(1, 'minute').toISOString()
      })
      let obj = OrganizationRouter.transformSingleOrg(originalObject)
      expect(obj.isInTrial).to.equal(true)
      expect(obj.isInActivePeriod).to.equal(false)
      expect(obj.allowed).to.equal(true)
    })

    it('should return `allowed` true if `isInActivePeriod` is true', () => {
      Object.assign(originalObject, {
        trialEnd: now.clone().subtract(1, 'minute').toISOString(),
        activePeriodEnd: now.clone().add(1, 'minute').toISOString()
      })
      let obj = OrganizationRouter.transformSingleOrg(originalObject)
      expect(obj.isInTrial).to.equal(false)
      expect(obj.isInActivePeriod).to.equal(true)
      expect(obj.allowed).to.equal(true)
    })

    it('should return `allowed` false if both `isInActivePeriod` and `isInTrial` are false', () => {
      Object.assign(originalObject, {
        trialEnd: now.clone().subtract(1, 'minute').toISOString(),
        activePeriodEnd: now.clone().subtract(1, 'minute').toISOString()
      })
      let obj = OrganizationRouter.transformSingleOrg(originalObject)
      expect(obj.isInTrial).to.equal(false)
      expect(obj.isInActivePeriod).to.equal(false)
      expect(obj.allowed).to.equal(false)
    })

    it('should return `allowed` false if is_active is false', () => {
      Object.assign({}, {
        trialEnd: now.clone().subtract(1, 'minute').toISOString(),
        activePeriodEnd: now.clone().add(1, 'minute').toISOString()
      })
      let obj = OrganizationRouter.transformSingleOrg(originalObject)
      expect(obj.allowed).to.equal(false)
    })
  })

  describe('get', () => {
    let collectionStub
    let orgsCollectionMock

    beforeEach(() => {
      requestStub = { query: {} }
      orgsCollectionMock = {
        toJSON: sinon.stub().returns([orgMockJSON, orgMockJSON])
      }
      collectionStub = {}
      collectionStub.query = sinon.stub().returns(collectionStub)
      collectionStub.fetch = sinon.stub().resolves(orgsCollectionMock)
      collectionConstructorStub = sinon.stub(Organization, 'collection').returns(collectionStub)
    })

    afterEach(() => {
      collectionConstructorStub.restore()
    })

    it('should create a collection', () => {
      return OrganizationRouter.get(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(collectionConstructorStub)
        })
    })

    it('should pass the query to `where`', () => {
      return OrganizationRouter.get(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(collectionStub.query)
          sinon.assert.calledWithExactly(
            collectionStub.query,
            { where: requestStub.query }
          )
        })
    })

    it('should fetch the results', () => {
      return OrganizationRouter.get(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(collectionStub.fetch)
          sinon.assert.calledWithExactly(
            collectionStub.fetch,
            { withRelated: 'users' }
          )
        })
    })

    it('should call `transformSingleOrg` on every org', () => {
      return OrganizationRouter.get(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledTwice(transformSingleOrgSpy)
          sinon.assert.calledWith(
            transformSingleOrgSpy,
            sinon.match(orgMockJSON)
          )
        })
    })

    it('should pass the results to `res.json`', () => {
      return OrganizationRouter.get(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(orgsCollectionMock.toJSON)
          sinon.assert.calledOnce(responseStub.json)
          sinon.assert.calledWith(
            responseStub.json,
            [sinon.match(orgMockJSON), sinon.match(orgMockJSON)]
          )
        })
    })

    it('should return the error if `fetch` return an error', () => {
      let err = new Error('Sample Error')
      collectionStub.fetch.rejects(err)

      return OrganizationRouter.get(requestStub, responseStub)
        .catch(err => {
          expect(err).to.exist
          expect(err).to.equal(err)
        })
    })
  })

  describe('getOne', () => {
    let orgId = 7
    beforeEach(() => {
      requestStub = {
        params: { id: orgId }
      }
    })

    it('should fetch with `fetchById`', () => {
      return OrganizationRouter.getOne(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(fetchByIdStub)
          sinon.assert.calledWithExactly(
            fetchByIdStub,
            orgId,
            { withRelated: 'users' }
          )
        })
    })

    it('should fetch with `fetchById`', () => {
      return OrganizationRouter.getOne(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(fetchByIdStub)
          sinon.assert.calledWithExactly(
            fetchByIdStub,
            orgId,
            { withRelated: 'users' }
          )
        })
    })

    it('should pass the results to `res.json`', () => {
      return OrganizationRouter.getOne(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(orgMock.toJSON)
          sinon.assert.calledOnce(responseStub.json)
          sinon.assert.calledWithExactly(
            responseStub.json,
            sinon.match(orgMockJSON)
          )
        })
    })

    it('should return the error if `fetch` return an error', () => {
      let err = new NotFoundError('Organization Not Found')
      fetchByIdStub.rejects(err)

      return OrganizationRouter.getOne(requestStub, responseStub)
        .catch(err => {
          expect(err).to.exist
          expect(err).to.equal(err)
        })
    })
  })

  describe('patchOne', () => {
    let orgId = 7
    let stripeCustomerId = 234

    beforeEach(() => {
      requestStub = {
        params: { id: orgId },
        body: { stripeCustomerId: stripeCustomerId }
      }
    })

    it('should fetch with `fetchById`', () => {
      return OrganizationRouter.patchOne(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(fetchByIdStub)
          sinon.assert.calledWithExactly(
            fetchByIdStub,
            orgId
          )
        })
    })

    it('should save the results in the body using `save`', () => {
      return OrganizationRouter.patchOne(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(orgMock.save)
          sinon.assert.calledWithExactly(
            orgMock.save,
            { stripeCustomerId: stripeCustomerId }
          )
        })
    })

    it('should pass the results to `res.json`', () => {
      return OrganizationRouter.patchOne(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(orgMock.toJSON)
          sinon.assert.calledOnce(responseStub.json)
          sinon.assert.calledWithExactly(
            responseStub.json,
            sinon.match(orgMockJSON)
          )
        })
    })

    it('should return the error if `fetch` return an error', () => {
      let err = new NotFoundError('Organization Not Found')
      fetchByIdStub.rejects(err)

      return OrganizationRouter.patchOne(requestStub, responseStub)
        .catch(err => {
          expect(err).to.exist
          expect(err).to.equal(err)
        })
    })
  })

  describe('addUser', () => {
    let orgId = 7
    let userId = 12

    beforeEach(() => {
      requestStub = {
        params: { id: orgId },
        body: { user: { id: userId } }
      }
    })

    it('should fetch both user and org with `fetchById`', () => {
      return OrganizationRouter.addUser(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(fetchByIdStub)
          sinon.assert.calledOnce(userFetchByIdStub)
          sinon.assert.calledWithExactly(
            fetchByIdStub,
            orgId
          )
          sinon.assert.calledWithExactly(
            userFetchByIdStub,
            userId
          )
        })
    })

    it('should attempt to add the user', () => {
      return OrganizationRouter.addUser(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(orgMock.addUser)
          sinon.assert.calledWithExactly(
            orgMock.addUser,
            userMock
          )
        })
    })

    it('should fetch itself after it adds the user', () => {
      return OrganizationRouter.addUser(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(orgMock.fetch)
          sinon.assert.calledWithExactly(
            orgMock.fetch,
            { withRelated: 'users' }
          )
        })
    })

    it('should pass the results to `res.json`', () => {
      return OrganizationRouter.addUser(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(orgMock.toJSON)
          sinon.assert.calledOnce(responseStub.json)
          sinon.assert.calledWithExactly(
            responseStub.json,
            sinon.match(orgMockJSON)
          )
        })
    })

    it('should return the error if `fetch` return an error', (done) => {
      let err = new NotFoundError('Organization Not Found')
      fetchByIdStub.rejects(err)

      return OrganizationRouter.addUser(requestStub, responseStub)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.equal(err)
          done()
        })
    })

    it('should return the error if `fetch user` return an error', (done) => {
      let err = new NotFoundError('Organization Not Found')
      userFetchByIdStub.rejects(err)

      return OrganizationRouter.addUser(requestStub, responseStub)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.equal(err)
          done()
        })
    })
  })
})
