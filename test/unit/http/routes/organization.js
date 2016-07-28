'use strict'

const Promise = require('bluebird')
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const expect = require('chai').expect

const express = require('express')
const moment = require('moment')

const NotFoundError = require('errors/not-found-error')
const Organization = require('models/organization')
const OrganizationRouter = require('http/routes/organization')

describe('HTTP /organization', () => {
  let collectionConstructorStub
  let orgMock
  let orgMockJSON
  let responseStub
  let fetchByIdStub
  let requestStub
  let tranformSingleOrgSpy

  beforeEach(() => {
    orgMockJSON = { id: 1 }
    orgMock = {
      save: sinon.stub().returnsThis(),
      toJSON: sinon.stub().returns(orgMockJSON)
    }
    fetchByIdStub = sinon.stub(Organization, 'fetchById').resolves(orgMock)
    tranformSingleOrgSpy = sinon.spy(OrganizationRouter, 'tranformSingleOrg')
    responseStub = {
      json: sinon.stub()
    }
  })

  afterEach(() => {
    fetchByIdStub.restore()
    tranformSingleOrgSpy.restore()
  })

  describe('#router', () => {
    it('should return an express router', () => {
      let router = OrganizationRouter.router()
      expect(router).to.be.an.instanceOf(express.Router().constructor)
    })
  })

  describe('tranformSingleOrg', () => {
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
      let obj = OrganizationRouter.tranformSingleOrg(originalObject)
      expect(obj).to.not.equal(originalObject)
    })

    it('should transform `trialEnd`, `activePeriodEnd`, `gracePeriodEnd` to unix timestamps', () => {
      let obj = OrganizationRouter.tranformSingleOrg(originalObject)
      expect(obj.trialEnd).to.equal(now.format('X'))
      expect(obj.activePeriodEnd).to.equal(now.format('X'))
      expect(obj.gracePeriodEnd).to.equal(now.format('X'))
    })

    it('should return `true` for `isPastTrial`, `isPastActivePeriod`, and `isPastGracePeriod`if trial, active period and grace period have passed', () => {
      Object.assign(originalObject, {
        trialEnd: now.clone().add(1, 'minute').toISOString(),
        activePeriodEnd: now.clone().add(1, 'minute').toISOString(),
        gracePeriodEnd: now.clone().add(1, 'minute').toISOString()
      })
      let obj = OrganizationRouter.tranformSingleOrg(originalObject)
      expect(obj.isPastTrial).to.equal(true)
      expect(obj.isPastActivePeriod).to.equal(true)
      expect(obj.isPastGracePeriod).to.equal(true)
    })

    it('should return `false` for `isPastTrial`, `isPastActivePeriod`, and `is`if trial, active period and grace period have not passed', () => {
      Object.assign(originalObject, {
        trialEnd: now.clone().subtract(1, 'minute').toISOString(),
        activePeriodEnd: now.clone().subtract(1, 'minute').toISOString(),
        gracePeriodEnd: now.clone().subtract(1, 'minute').toISOString()
      })
      let obj = OrganizationRouter.tranformSingleOrg(originalObject)
      expect(obj.isPastTrial).to.equal(false)
      expect(obj.isPastActivePeriod).to.equal(false)
      expect(obj.isPastGracePeriod).to.equal(false)
    })

    it('should return `allowed` true if both `isPastTrial` and `isPastActivePeriod` are true', () => {
      Object.assign(originalObject, {
        trialEnd: now.clone().add(1, 'minute').toISOString(),
        activePeriodEnd: now.clone().add(1, 'minute').toISOString()
      })
      let obj = OrganizationRouter.tranformSingleOrg(originalObject)
      expect(obj.isPastTrial).to.equal(true)
      expect(obj.isPastActivePeriod).to.equal(true)
      expect(obj.allowed).to.equal(true)
    })

    it('should return `allowed` true if both `isPastTrial` is true', () => {
      Object.assign(originalObject, {
        trialEnd: now.clone().add(1, 'minute').toISOString(),
        activePeriodEnd: now.clone().subtract(1, 'minute').toISOString()
      })
      let obj = OrganizationRouter.tranformSingleOrg(originalObject)
      expect(obj.isPastTrial).to.equal(true)
      expect(obj.isPastActivePeriod).to.equal(false)
      expect(obj.allowed).to.equal(true)
    })

    it('should return `allowed` true if `isPastActivePeriod` is true', () => {
      Object.assign(originalObject, {
        trialEnd: now.clone().subtract(1, 'minute').toISOString(),
        activePeriodEnd: now.clone().add(1, 'minute').toISOString()
      })
      let obj = OrganizationRouter.tranformSingleOrg(originalObject)
      expect(obj.isPastTrial).to.equal(false)
      expect(obj.isPastActivePeriod).to.equal(true)
      expect(obj.allowed).to.equal(true)
    })

    it('should return `allowed` false if both `isPastActivePeriod` and `isPastTrial` are false', () => {
      Object.assign(originalObject, {
        trialEnd: now.clone().subtract(1, 'minute').toISOString(),
        activePeriodEnd: now.clone().subtract(1, 'minute').toISOString()
      })
      let obj = OrganizationRouter.tranformSingleOrg(originalObject)
      expect(obj.isPastTrial).to.equal(false)
      expect(obj.isPastActivePeriod).to.equal(false)
      expect(obj.allowed).to.equal(false)
    })

    it('should return `allowed` false if is_active is false', () => {
      Object.assign({}, {
        trialEnd: now.clone().subtract(1, 'minute').toISOString(),
        activePeriodEnd: now.clone().add(1, 'minute').toISOString()
      })
      let obj = OrganizationRouter.tranformSingleOrg(originalObject)
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

    it('should call `tranformSingleOrg` on every org', () => {
      return OrganizationRouter.get(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledTwice(tranformSingleOrgSpy)
          sinon.assert.calledWith(
            tranformSingleOrgSpy,
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
})
