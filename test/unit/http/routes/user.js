'use strict'

const Promise = require('bluebird')
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const expect = require('chai').expect

const express = require('express')

const NotFoundError = require('errors/not-found-error')
const User = require('models/user')
const UserRouter = require('http/routes/user')

describe('HTTP /user', () => {
  let collectionConstructorStub
  let userMock
  let userMockJSON
  let responseStub
  let fetchByIdStub
  let requestStub

  beforeEach(() => {
    userMockJSON = { id: 1 }
    userMock = {
      save: sinon.stub().returnsThis(),
      toJSON: sinon.stub().returns(userMockJSON)
    }
    fetchByIdStub = sinon.stub(User, 'fetchById').resolves(userMock)
    responseStub = {
      json: sinon.stub()
    }
  })

  afterEach(() => {
    fetchByIdStub.restore()
  })

  describe('#router', () => {
    it('should return an express router', () => {
      let router = UserRouter.router()
      expect(router).to.be.an.instanceOf(express.Router().constructor)
    })
  })

  describe('#get', () => {
    let collectionStub

    beforeEach(() => {
      requestStub = { query: {} }
      collectionStub = {}
      collectionStub.query = sinon.stub().returns(collectionStub)
      collectionStub.fetch = sinon.stub().resolves(userMock)
      collectionConstructorStub = sinon.stub(User, 'collection').returns(collectionStub)
    })

    afterEach(() => {
      collectionConstructorStub.restore()
    })

    it('should create a collection', () => {
      return UserRouter.get(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(collectionConstructorStub)
        })
    })

    it('should pass the query to `where`', () => {
      return UserRouter.get(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(collectionStub.query)
          sinon.assert.calledWithExactly(
            collectionStub.query,
            { where: requestStub.query }
          )
        })
    })

    it('should fetch the results', () => {
      return UserRouter.get(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(collectionStub.fetch)
          sinon.assert.calledWithExactly(
            collectionStub.fetch,
            { withRelated: 'organizations' }
          )
        })
    })

    it('should pass the results to `res.json`', () => {
      return UserRouter.get(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(userMock.toJSON)
          sinon.assert.calledOnce(responseStub.json)
          sinon.assert.calledWithExactly(
            responseStub.json,
            userMockJSON
          )
        })
    })

    it('should return the error if `fetch` return an error', () => {
      let err = new Error('Sample Error')
      collectionStub.fetch.rejects(err)

      return UserRouter.get(requestStub, responseStub)
        .catch(err => {
          expect(err).to.exist
          expect(err).to.equal(err)
        })
    })
  })

  describe('getOne', () => {
    let userId = 7
    beforeEach(() => {
      requestStub = {
        params: { id: userId }
      }
    })

    it('should fetch with `fetchById`', () => {
      return UserRouter.getOne(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(fetchByIdStub)
          sinon.assert.calledWithExactly(
            fetchByIdStub,
            userId,
            { withRelated: 'organizations' }
          )
        })
    })

    it('should fetch with `fetchById`', () => {
      return UserRouter.getOne(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(fetchByIdStub)
          sinon.assert.calledWithExactly(
            fetchByIdStub,
            userId,
            { withRelated: 'organizations' }
          )
        })
    })

    it('should pass the results to `res.json`', () => {
      return UserRouter.getOne(requestStub, responseStub)
        .then(() => {
          sinon.assert.calledOnce(userMock.toJSON)
          sinon.assert.calledOnce(responseStub.json)
          sinon.assert.calledWithExactly(
            responseStub.json,
            userMockJSON
          )
        })
    })

    it('should return the error if `fetch` return an error', () => {
      let err = new NotFoundError('User Not Found')
      fetchByIdStub.rejects(err)

      return UserRouter.getOne(requestStub, responseStub)
        .catch(err => {
          expect(err).to.exist
          expect(err).to.equal(err)
        })
    })
  })
})
