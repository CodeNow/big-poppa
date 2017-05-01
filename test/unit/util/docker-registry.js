'use strict'

const DockerRegistry = require('util/docker-registry')
const dockerRegistryClient = require('docker-registry-client')
const expect = require('chai').expect
const Promise = require('bluebird')
const RegistryDoesNotSupportLoginError =  require('errors/registry-does-not-support-login-error')
const sinon = require('sinon')
const UnauthorizedError = require('errors/unauthorized-error')

require('sinon-as-promised')(Promise)

describe('DockerRegistry', () => {
  describe('validateCredentials', () => {
    const url = 'https://example.com'
    const username = 'username'
    const password = 'password'
    beforeEach((done) => {
      sinon.stub(dockerRegistryClient, 'login').yields(null, {}, {
        statusCode: 200
      })
      done()
    })
    afterEach((done) => {
      dockerRegistryClient.login.restore()
      done()
    })
    it('should trigger login on docker registry client', (done) => {
      DockerRegistry.validateCredentials(url, username, password)
        .tap(() => {
          sinon.assert.calledOnce(dockerRegistryClient.login)
          sinon.assert.calledWith(dockerRegistryClient.login, {
            index: url,
            log: sinon.match.object,
            password,
            username
          })
        })
        .asCallback(done)
    })
    it('should handle registry authentication failures', (done) => {
      dockerRegistryClient.login.yields(null, {}, {
        statusCode: 401
      })
      DockerRegistry.validateCredentials(url, username, password)
        .asCallback((err) => {
          expect(err).to.be.instanceOf(UnauthorizedError)
          done()
        })
    })
    it('should handle registry unsupported failures', (done) => {
      dockerRegistryClient.login.yields(null, {}, {
        statusCode: 404
      })
      DockerRegistry.validateCredentials(url, username, password)
        .asCallback((err) => {
          expect(err).to.be.instanceOf(RegistryDoesNotSupportLoginError)
          done()
        })
    })
    it('should handle generic errors', (done) => {
      const myError = new Error('GENERIC ERROR')
      dockerRegistryClient.login.yields(myError)
      DockerRegistry.validateCredentials(url, username, password)
        .asCallback((err) => {
          expect(err.message).to.equal(myError.message)
          done()
        })
    })
  })
})
