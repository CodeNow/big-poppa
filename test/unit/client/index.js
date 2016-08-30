'use strict'

const Promise = require('bluebird')
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const expect = require('chai').expect

const BigPoppaClient = require('../../../client')

describe('BigPoppa Client', () => {
  let bigPoppaClient

  beforeEach(() => {
    sinon.stub(BigPoppaClient.prototype, 'getAsync').resolves()
    sinon.stub(BigPoppaClient.prototype, 'patchAsync').resolves()
    sinon.stub(BigPoppaClient.prototype, 'postAsync').resolves({
      statusCode: 200
    })
  })
  beforeEach(() => {
    bigPoppaClient = new BigPoppaClient('asdasdasd')
  })

  afterEach(() => {
    BigPoppaClient.prototype.getAsync.restore()
    BigPoppaClient.prototype.patchAsync.restore()
    BigPoppaClient.prototype.postAsync.restore()
  })

  describe('addUserToOrganization', () => {
    it('should reject if no orgId', () => {
      return bigPoppaClient.addUserToOrganization()
        .catch(err => {
          expect(err.message).to.equal('missing orgId')
        })
    })
    it('should reject if no userId', () => {
      return bigPoppaClient.addUserToOrganization(23)
        .catch(err => {
          expect(err.message).to.equal('missing userId')
        })
    })
  })

  describe('getUser', () => {
    it('should reject if no userId', () => {
      return bigPoppaClient.getUser()
        .catch(err => {
          expect(err.message).to.equal('missing userId')
        })
    })
  })
  describe('updateOrganization', () => {
    it('should reject if no orgId', () => {
      return bigPoppaClient.updateOrganization()
        .catch(err => {
          expect(err.message).to.equal('missing orgId')
        })
    })
  })
  describe('getOrganization', () => {
    it('should reject if no orgId', () => {
      return bigPoppaClient.getOrganization()
        .catch(err => {
          expect(err.message).to.equal('missing orgId')
        })
    })
  })
  describe('createOrUpdateUser', () => {
    const githubId = 123
    const authToken = 'authToken123'

    it('should post user parameters', () => {
      return bigPoppaClient.createOrUpdateUser(githubId, authToken)
        .then(() => {
          sinon.assert.calledOnce(BigPoppaClient.prototype.postAsync)
          sinon.assert.calledWith(BigPoppaClient.prototype.postAsync, {
            path: '/user/',
            body: { githubId: githubId, authToken: authToken },
            json: true
          })
        })
    })
  })
})
