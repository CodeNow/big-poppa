'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const bookshelf = require('common/models').bookshelf
const User = require('common/models/user')
const Organization = require('common/models/organization')

const NotFoundError = require('common/errors/not-found-error')
const NoRowsDeletedError = require('common/errors/no-rows-deleted-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const WorkerError = require('error-cat/errors/worker-error')

const DeleteOrganization = require('prometheus/workers/organization.delete')

describe('#organization.delete', () => {
  let githubId = 123
  let org
  let validJob
  let userIds
  let users
  let fetchByGithubIdStub

  let destroyStub
  let transactionStub
  let getAllIdsForRelatedStub
  let fetchUserByIdStub
  let removeUserStub
  let transaction

  beforeEach(() => {
    userIds = [456, 789]
    validJob = { githubId: githubId }
    org = new Organization()
    users = [new User({ id: userIds[0] }), new User({ id: userIds[1] })]
    transaction = {}
    transactionStub = sinon.stub(bookshelf, 'transaction', (cb) => {
      return Promise.resolve(cb(transaction))
    })

    fetchByGithubIdStub = sinon.stub(Organization, 'fetchByGithubId').resolves(org)
    getAllIdsForRelatedStub = sinon.stub(Organization.prototype, 'getAllIdsForRelated').resolves(userIds)
    destroyStub = sinon.stub(Organization.prototype, 'destroy').resolves(org)

    fetchUserByIdStub = sinon.stub(User, 'fetchById')
    fetchUserByIdStub
      .onFirstCall().resolves(users[0])
      .onSecondCall().resolves(users[1])
    removeUserStub = sinon.stub(Organization.prototype, 'removeUser').resolves(org)
  })

  afterEach(() => {
    transactionStub.restore()
    fetchByGithubIdStub.restore()
    getAllIdsForRelatedStub.restore()
    destroyStub.restore()
    fetchUserByIdStub.restore()
    removeUserStub.restore()
  })

  describe('Validation', () => {
    it('should not validate if a `githubId` is not passed', done => {
      DeleteOrganization({ hello: 'world' })
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.message).to.match(/invalid.*job/i)
          done()
        })
    })

    it('should not validate if the `githubId` is not a number', done => {
      DeleteOrganization({ githubId: 'world' })
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.message).to.match(/invalid.*job/i)
          done()
        })
    })

    it('should validate if a valid job is passed', done => {
      DeleteOrganization(validJob)
        .asCallback(done)
    })
  })

  describe('Errors', () => {
    it('should throw a `WorkerStopError` if a `Organization.fetchByGithubId` throws a `NotFoundError`', done => {
      let originalErr = new NotFoundError('No org found')
      fetchByGithubIdStub.rejects(originalErr)

      DeleteOrganization(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.data.err).to.equal(originalErr)
          expect(err.message).to.match(/org.*not.*deleted/i)
          sinon.assert.calledOnce(fetchByGithubIdStub)
          done()
        })
    })

    it('should throw a `WorkerError` if a `Organization.fetchById` throws an error', done => {
      let originalErr = new NoRowsDeletedError()
      fetchUserByIdStub.onFirstCall().rejects(originalErr)

      DeleteOrganization(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerError)
          expect(err.data.err).to.equal(originalErr)
          expect(err.message).to.match(/error.*removing.*org/i)
          sinon.assert.calledOnce(fetchByGithubIdStub)
          done()
        })
    })

    it('should throw a `WorkerError` if a `Organization.removeUser` throws an error', done => {
      let originalErr = new NoRowsDeletedError()
      removeUserStub.rejects(originalErr)

      DeleteOrganization(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerError)
          expect(err.data.err).to.equal(originalErr)
          expect(err.message).to.match(/error.*removing.*org/i)
          sinon.assert.calledOnce(fetchByGithubIdStub)
          done()
        })
    })

    it('should throw a `WorkerStopError` if `Organization.destroy` returns a `NoRowsDeletedError`', done => {
      let originalErr = new NoRowsDeletedError()
      destroyStub.rejects(originalErr)

      DeleteOrganization(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.data.err).to.equal(originalErr)
          expect(err.message).to.match(/org.*not.*deleted/i)
          sinon.assert.calledOnce(fetchByGithubIdStub)
          done()
        })
    })
  })

  describe('Main Functionality', () => {
    it('should start a transaction', done => {
      DeleteOrganization(validJob)
        .then(() => {
          sinon.assert.calledOnce(transactionStub)
          sinon.assert.calledWithExactly(transactionStub, sinon.match.func)
        })
        .asCallback(done)
    })

    it('should fetch the org by its github id', done => {
      DeleteOrganization(validJob)
        .then(() => {
          sinon.assert.calledOnce(fetchByGithubIdStub)
          sinon.assert.calledWithExactly(
            fetchByGithubIdStub,
            githubId,
            { transacting: transaction }
          )
        })
        .asCallback(done)
    })

    it('should get all the related users for that org', done => {
      DeleteOrganization(validJob)
        .then(() => {
          sinon.assert.calledOnce(getAllIdsForRelatedStub)
          sinon.assert.calledWithExactly(
            getAllIdsForRelatedStub,
            'users',
            { transacting: transaction }
          )
        })
        .asCallback(done)
    })

    it('should fetch the user\'s organizations and remove then', done => {
      DeleteOrganization(validJob)
        .then(() => {
          sinon.assert.calledTwice(fetchUserByIdStub)
          sinon.assert.calledWithExactly(
            fetchUserByIdStub.firstCall,
            userIds[0],
            { transacting: transaction }
          )
          sinon.assert.calledWithExactly(
            fetchUserByIdStub.secondCall,
            userIds[1],
            { transacting: transaction }
          )
          sinon.assert.calledTwice(removeUserStub)
          let firstCall = removeUserStub.firstCall
          let secondCall = removeUserStub.secondCall
          sinon.assert.calledWithExactly(
            firstCall,
            users[0],
            { transacting: transaction }
          )
          sinon.assert.calledWithExactly(
            secondCall,
            users[1],
            { transacting: transaction }
          )
          expect(firstCall.thisValue).to.equal(org)
          expect(secondCall.thisValue).to.equal(org)
        })
        .asCallback(done)
    })

    it('should `destroy` the org', done => {
      DeleteOrganization(validJob)
        .then(() => {
          sinon.assert.calledOnce(destroyStub)
          let firstCall = destroyStub.firstCall
          sinon.assert.calledWithExactly(
            firstCall,
            { require: true, transacting: transaction }
          )
          expect(firstCall.thisValue).to.equal(org)
        })
        .asCallback(done)
    })
  })
})
