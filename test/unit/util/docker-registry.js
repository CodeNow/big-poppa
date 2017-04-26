'use strict'

const dockerRegistryClient = require('docker-registry-client')
const DockerRegistry = require('util/docker-registry')
const sinon = require('sinon')
const Promise = require('bluebird')

require('sinon-as-promised')(Promise)

describe('DockerRegistry', () => {
  describe('validateCredentials', () => {
    const url = 'https://example.com'
    const username = 'username'
    const password = 'password'
    beforeEach((done) => {
      sinon.stub(dockerRegistryClient, 'login').yields(null, {})
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
  })
})
