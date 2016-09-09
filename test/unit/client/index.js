'use strict'

const Promise = require('bluebird')
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const expect = require('chai').expect
const testUtil = require('../../util')

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
        .then(testUtil.throwIfSuccess)
        .catch(err => {
          expect(err.message).to.equal('missing orgId')
        })
    })
    it('should reject if no userId', () => {
      return bigPoppaClient.addUserToOrganization(23)
        .then(testUtil.throwIfSuccess)
        .catch(err => {
          expect(err.message).to.equal('missing userId')
        })
    })
  })

  describe('getUser', () => {
    it('should reject if no userId', () => {
      return bigPoppaClient.getUser()
        .then(testUtil.throwIfSuccess)
        .catch(err => {
          expect(err.message).to.equal('missing userId')
        })
    })
  })
  describe('updateOrganization', () => {
    it('should reject if no orgId', () => {
      return bigPoppaClient.updateOrganization()
        .then(testUtil.throwIfSuccess)
        .catch(err => {
          expect(err.message).to.equal('missing orgId')
        })
    })
  })
  describe('getOrganization', () => {
    it('should reject if no orgId', () => {
      return bigPoppaClient.getOrganization()
        .then(testUtil.throwIfSuccess)
        .catch(err => {
          expect(err.message).to.equal('missing orgId')
        })
    })
  })
  describe('createOrUpdateUser', () => {
    const githubId = 123
    const accessToken = 'accessToken123'

    it('should post user parameters', () => {
      return bigPoppaClient.createOrUpdateUser(githubId, accessToken)
        .then(() => {
          sinon.assert.calledOnce(BigPoppaClient.prototype.postAsync)
          sinon.assert.calledWith(BigPoppaClient.prototype.postAsync, {
            path: '/user/',
            body: { githubId: githubId, accessToken: accessToken },
            json: true
          })
        })
    })
  })
})
