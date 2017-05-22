'use strict'

const DockerRegistry = require('util/docker-registry')
const dockerRegistryClient = require('docker-registry-client')
const expect = require('chai').expect
const Promise = require('bluebird')
const sinon = require('sinon')

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
