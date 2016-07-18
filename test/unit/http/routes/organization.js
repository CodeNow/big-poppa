'use strict'

const Promise = require('bluebird')
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const expect = require('chai').expect

const express = require('express')

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

  beforeEach(() => {
    orgMockJSON = { id: 1 }
    orgMock = {
      save: sinon.stub().returnsThis(),
      toJSON: sinon.stub().returns(orgMockJSON)
    }
    fetchByIdStub = sinon.stub(Organization, 'fetchById').resolves(orgMock)
    responseStub = {
      json: sinon.stub()
    }
  })

  afterEach(() => {
    fetchByIdStub.restore()
  })

  describe('#router', () => {
    it('should return an express router', () => {
      let router = OrganizationRouter.router()
      expect(router).to.be.an.instanceOf(express.Router().constructor)
    })
  })

  describe('get', () => {
    let collectionStub

    beforeEach(() => {
      requestStub = { query: {} }
      collectionStub = {}
      collectionStub.query = sinon.stub().returns(collectionStub)
      collectionStub.fetch = sinon.stub().resolves(orgMock)
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
        })
    })

    it('should pass the results to `res.json`', () => {
      return OrganizationRouter.get(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(orgMock.toJSON)
          sinon.assert.calledOnce(responseStub.json)
          sinon.assert.calledWithExactly(
            responseStub.json,
            orgMockJSON
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
            orgId
          )
        })
    })

    it('should fetch with `fetchById`', () => {
      return OrganizationRouter.getOne(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(fetchByIdStub)
          sinon.assert.calledWithExactly(
            fetchByIdStub,
            orgId
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
            orgMockJSON
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
        body: { stripe_customer_id: stripeCustomerId }
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
            { stripe_customer_id: stripeCustomerId }
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
            orgMockJSON
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
