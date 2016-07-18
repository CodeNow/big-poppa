'use strict'

const Promise = require('bluebird')
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const expect = require('chai').expect

const Joi = Promise.promisifyAll(require('joi'))

const NotFoundError = require('errors/not-found-error')
const BaseRouter = require('http/routes/base')

describe('HTTP Base Router', () => {
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
        responseStub = {}
        responseStub.status = sinon.stub().returnsThis()
        responseStub.json = sinon.stub().resolves()
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
              rawRequest,
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
              rawRequest,
              responseStub,
              err
            )
          })
      })
    })
  })

  describe('#errorHandler', () => {
    it('should throw a 500 error if no error is matched', () => {
    })

    it('should throw a 400 error if there is a validation error', () => {
    })

    it('should throw a 404 error if there is no resource found', () => {
    })
  })
})
