'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const bookshelf = require('models').bookshelf
const User = require('models/user')
const Organization = require('models/organization')

const NotFoundError = require('errors/not-found-error')
const NoRowsDeletedError = require('errors/no-rows-deleted-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const WorkerError = require('error-cat/errors/worker-error')

const DeleteUser = require('workers/user.delete')

describe('#user.delete', () => {
  let githubId = 123
  let user
  let validJob
  let orgIds
  let orgs
  let fetchByGithubIdStub

  let destroyStub
  let transactionStub
  let getAllIdsForRelatedStub
  let fetchOrgByIdStub
  let removeUserStub
  let transaction

  beforeEach(() => {
    orgIds = [456, 789]
    validJob = { githubId: githubId }
    user = new User()
    orgs = [new Organization({ id: orgIds[0] }), new Organization({ id: orgIds[1] })]
    transaction = {}
    transactionStub = sinon.stub(bookshelf, 'transaction', (cb) => {
      return Promise.resolve(cb(transaction))
    })

    fetchByGithubIdStub = sinon.stub(User, 'fetchByGithubId').resolves(user)
    getAllIdsForRelatedStub = sinon.stub(User.prototype, 'getAllIdsForRelated').resolves(orgIds)
    destroyStub = sinon.stub(User.prototype, 'destroy').resolves(user)

    fetchOrgByIdStub = sinon.stub(Organization, 'fetchById')
    fetchOrgByIdStub
      .onFirstCall().resolves(orgs[0])
      .onSecondCall().resolves(orgs[1])
    removeUserStub = sinon.stub(Organization.prototype, 'removeUser').resolves(user)
  })

  afterEach(() => {
    transactionStub.restore()
    fetchByGithubIdStub.restore()
    getAllIdsForRelatedStub.restore()
    destroyStub.restore()
    fetchOrgByIdStub.restore()
    removeUserStub.restore()
  })

  describe('Validation', () => {
    it('should not validate if a `githubId` is not passed', done => {
      DeleteUser({ hello: 'world' })
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.message).to.match(/invalid.*job/i)
          done()
        })
    })

    it('should not validate if the `githubId` is not a number', done => {
      DeleteUser({ githubId: 'world' })
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.message).to.match(/invalid.*job/i)
          done()
        })
    })

    it('should validate if a valid job is passed', done => {
      DeleteUser(validJob)
        .asCallback(done)
    })
  })

  describe('Errors', () => {
    it('should throw a `WorkerStopError` if a `User.fetchByGithubId` throws a `NotFoundError`', done => {
      let originalErr = new NotFoundError('No user found')
      fetchByGithubIdStub.rejects(originalErr)

      DeleteUser(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.data.err).to.equal(originalErr)
          expect(err.message).to.match(/user.*not.*deleted/i)
          sinon.assert.calledOnce(fetchByGithubIdStub)
          done()
        })
    })

    it('should throw a `WorkerError` if a `Organization.fetchById` throws an error', done => {
      let originalErr = new NoRowsDeletedError()
      fetchOrgByIdStub.onFirstCall().rejects(originalErr)

      DeleteUser(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerError)
          expect(err.data.err).to.equal(originalErr)
          expect(err.message).to.match(/error.*removing.*user/i)
          sinon.assert.calledOnce(fetchByGithubIdStub)
          done()
        })
    })

    it('should throw a `WorkerError` if a `Organization.removeUser` throws an error', done => {
      let originalErr = new NoRowsDeletedError()
      removeUserStub.rejects(originalErr)

      DeleteUser(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerError)
          expect(err.data.err).to.equal(originalErr)
          expect(err.message).to.match(/error.*removing.*user/i)
          sinon.assert.calledOnce(fetchByGithubIdStub)
          done()
        })
    })

    it('should throw a `WorkerStopError` if `User.destroy` returns a `NoRowsDeletedError`', done => {
      let originalErr = new NoRowsDeletedError()
      destroyStub.rejects(originalErr)

      DeleteUser(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.data.err).to.equal(originalErr)
          expect(err.message).to.match(/user.*not.*deleted/i)
          sinon.assert.calledOnce(fetchByGithubIdStub)
          done()
        })
    })
  })

  describe('Main Functionality', () => {
    it('should start a transaction', done => {
      DeleteUser(validJob)
        .then(() => {
          sinon.assert.calledOnce(transactionStub)
          sinon.assert.calledWithExactly(transactionStub, sinon.match.func)
        })
        .asCallback(done)
    })

    it('should fetch the user by its github id', done => {
      DeleteUser(validJob)
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

    it('should get all the related organizations for that user', done => {
      DeleteUser(validJob)
        .then(() => {
          sinon.assert.calledOnce(getAllIdsForRelatedStub)
          sinon.assert.calledWithExactly(
            getAllIdsForRelatedStub,
            'organizations',
            { transacting: transaction }
          )
        })
        .asCallback(done)
    })

    it('should fetch those organizations and remove then', done => {
      DeleteUser(validJob)
        .then(() => {
          sinon.assert.calledTwice(fetchOrgByIdStub)
          sinon.assert.calledWithExactly(
            fetchOrgByIdStub.firstCall,
            orgIds[0],
            { transacting: transaction }
          )
          sinon.assert.calledWithExactly(
            fetchOrgByIdStub.secondCall,
            orgIds[1],
            { transacting: transaction }
          )
          sinon.assert.calledTwice(removeUserStub)
          sinon.assert.calledWithExactly(
            removeUserStub,
            user,
            { transacting: transaction }
          )
          expect(removeUserStub.firstCall.thisValue).to.equal(orgs[0])
          expect(removeUserStub.secondCall.thisValue).to.equal(orgs[1])
        })
        .asCallback(done)
    })

    it('should `destroy` the user', done => {
      DeleteUser(validJob)
        .then(() => {
          sinon.assert.calledOnce(destroyStub)
          let firstCall = destroyStub.firstCall
          sinon.assert.calledWithExactly(
            firstCall,
            { require: true, transacting: transaction }
          )
          expect(firstCall.thisValue).to.equal(user)
        })
        .asCallback(done)
    })
  })
})
