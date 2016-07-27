'use strict'

const Promise = require('bluebird')
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const expect = require('chai').expect

const Joi = Promise.promisifyAll(require('joi'))

const NotFoundError = require('errors/not-found-error')
const GithubEntityError = require('errors/github-entity-error')
const NotNullError = require('errors/not-null-error')
const UniqueError = require('errors/unique-error')
const ForeignKeyError = require('errors/foreign-key-error')

const BaseRouter = require('http/routes/base')

describe('HTTP Base Router', () => {
  let responseStub

  beforeEach(() => {
    responseStub = {}
    responseStub.status = sinon.stub().returnsThis()
    responseStub.json = sinon.stub().resolves()
  })

  describe('#createRoute', () => {
    let schema

    beforeEach(() => {
      schema = Joi.object({})
    })

    it('should throw an error if no router is passed', () => {
      expect(() => {
        BaseRouter.createRoute(null, schema)
      }).to.throw(/router/i)
    })

    it('should throw an error if no schema is passed', () => {
      expect(() => {
        BaseRouter.createRoute(() => {}, null)
      }).to.throw(/schema/i)
    })

    it('should return a function that servers as a router', () => {
      let func = BaseRouter.createRoute(() => {}, schema)
      expect(func).to.be.a('function')
    })

    describe('Router', () => {
      let route
      let rawRequest
      let strippedRequest
      let responseStub
      let routerResponse
      let routerFunctionStub
      let validateAsyncStub
      let errorHandlerStub

      beforeEach(() => {
        rawRequest = {}
        strippedRequest = {}
        routerResponse = { a: 2 }
        validateAsyncStub = sinon.stub(Joi, 'validateAsync').resolves(strippedRequest)
        // Stub out error handler before it gets bound in `createRoute`
        errorHandlerStub = sinon.stub(BaseRouter, 'errorHandler').resolves()
        routerFunctionStub = sinon.stub().resolves(routerResponse)
        route = BaseRouter.createRoute(routerFunctionStub, schema)
      })

      afterEach(() => {
        validateAsyncStub.restore()
        errorHandlerStub.restore()
      })

      it('should validate the request against the schema', () => {
        return route(rawRequest, responseStub)
          .then(() => {
            sinon.assert.calledOnce(validateAsyncStub)
            sinon.assert.calledWithExactly(
              validateAsyncStub,
              rawRequest,
              schema,
              { stripUnknown: true }
            )
          })
      })

      it('should call the error handler if the validation fails', () => {
        let err = new Error('Validation Error')
        validateAsyncStub.rejects(err)

        return route(rawRequest, responseStub)
          .then(() => {
            sinon.assert.calledOnce(errorHandlerStub)
            sinon.assert.calledWithExactly(
              errorHandlerStub,
              responseStub,
              err
            )
          })
      })

      it('should call the router function with the request and response if the validations succeeds', () => {
        return route(rawRequest, responseStub)
          .then(() => {
            sinon.assert.calledOnce(routerFunctionStub)
            sinon.assert.calledWithExactly(
              routerFunctionStub,
              strippedRequest,
              responseStub
            )
          })
      })

      it('should call the error handler if the router function throws an error and pass the request and response', () => {
        let err = new NotFoundError('Organization Not Found')
        routerFunctionStub.rejects(err)

        return route(rawRequest, responseStub)
          .then(() => {
            sinon.assert.calledOnce(errorHandlerStub)
            sinon.assert.calledWithExactly(
              errorHandlerStub,
              responseStub,
              err
            )
          })
      })
    })
  })

  describe('#errorHandler', () => {
    it('should throw a 500 error if no error is matched', () => {
      let err = new Error('Random Error')
      BaseRouter.errorHandler(responseStub, err)
      sinon.assert.calledOnce(responseStub.status)
      sinon.assert.calledWithExactly(responseStub.status, 500)
      sinon.assert.calledOnce(responseStub.json)
      sinon.assert.calledWithExactly(
        responseStub.json,
        {
          statusCode: 500,
          message: sinon.match(/internal.*server.*error/i),
          err: err.message
        }
      )
    })

    it('should throw a 400 error if there is a validation error', () => {
      let err = new Error('Validation Error')
      err.isJoi = true
      BaseRouter.errorHandler(responseStub, err)
      sinon.assert.calledOnce(responseStub.status)
      sinon.assert.calledWithExactly(responseStub.status, 400)
      sinon.assert.calledOnce(responseStub.json)
      sinon.assert.calledWithExactly(
        responseStub.json,
        {
          statusCode: 400,
          message: sinon.match(/validation.*error/i),
          err: err.message
        }
      )
    })

    it('should throw a 400 error if there is a UniqueError', () => {
      let err = new UniqueError('Already exists')
      BaseRouter.errorHandler(responseStub, err)
      sinon.assert.calledOnce(responseStub.status)
      sinon.assert.calledWithExactly(responseStub.status, 400)
      sinon.assert.calledOnce(responseStub.json)
      sinon.assert.calledWithExactly(
        responseStub.json,
        {
          statusCode: 400,
          message: sinon.match(/unique.*error/i),
          err: err.message
        }
      )
    })

    it('should throw a 400 error if there is a GithubEntityError', () => {
      let err = new GithubEntityError('User not found')
      BaseRouter.errorHandler(responseStub, err)
      sinon.assert.calledOnce(responseStub.status)
      sinon.assert.calledWithExactly(responseStub.status, 400)
      sinon.assert.calledOnce(responseStub.json)
      sinon.assert.calledWithExactly(
        responseStub.json,
        {
          statusCode: 400,
          message: sinon.match(/github.*error/i),
          err: err.message
        }
      )
    })

    it('should throw a 400 error if there is a NotNullError', () => {
      let err = new NotNullError('Field cannot be null')
      BaseRouter.errorHandler(responseStub, err)
      sinon.assert.calledOnce(responseStub.status)
      sinon.assert.calledWithExactly(responseStub.status, 400)
      sinon.assert.calledOnce(responseStub.json)
      sinon.assert.calledWithExactly(
        responseStub.json,
        {
          statusCode: 400,
          message: sinon.match(/notnull.*error/i),
          err: err.message
        }
      )
    })

    it('should throw a 400 error if there is a ForeignKeyError', () => {
      let err = new ForeignKeyError('Already exists')
      BaseRouter.errorHandler(responseStub, err)
      sinon.assert.calledOnce(responseStub.status)
      sinon.assert.calledWithExactly(responseStub.status, 400)
      sinon.assert.calledOnce(responseStub.json)
      sinon.assert.calledWithExactly(
        responseStub.json,
        {
          statusCode: 400,
          message: sinon.match(/foreignkey.*error/i),
          err: err.message
        }
      )
    })

    it('should throw a 404 error if there is no resource found', () => {
      let err = new NotFoundError('Organization Not Found')
      BaseRouter.errorHandler(responseStub, err)
      sinon.assert.calledOnce(responseStub.status)
      sinon.assert.calledWithExactly(responseStub.status, 404)
      sinon.assert.calledOnce(responseStub.json)
      sinon.assert.calledWithExactly(
        responseStub.json,
        {
          statusCode: 404,
          message: sinon.match(/not.*found/i),
          err: err.message
        }
      )
    })
  })
})
