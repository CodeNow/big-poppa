'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const User = require('common/models/user')
const Organization = require('common/models/organization')

const NotFoundError = require('common/errors/not-found-error')
const UniqueError = require('common/errors/unique-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const AddUserToOrganization = require('hooray/workers/organization.user.add')

describe('#organization.user.add', () => {
  let user
  let org
  let orgGithubId = 123
  let userGithubId = 678
  let validJob

  let fetchOrgByGithubIdStub
  let fetchUserByGithubIdStub
  let addUserStub

  beforeEach(() => {
    user = new User({ id: userGithubId })
    org = new Organization({ id: orgGithubId })
    validJob = { organizationGithubId: orgGithubId, userGithubId: userGithubId }

    fetchOrgByGithubIdStub = sinon.stub(Organization, 'fetchByGithubId').resolves(org)
    fetchUserByGithubIdStub = sinon.stub(User, 'fetchByGithubId').resolves(user)
    addUserStub = sinon.stub(Organization.prototype, 'addUser').resolves(user)
  })

  afterEach(() => {
    fetchOrgByGithubIdStub.restore()
    fetchUserByGithubIdStub.restore()
    addUserStub.restore()
  })

  describe('Validation', () => {
    it('should not validate if a `organizationGithubId` is not passed', done => {
      AddUserToOrganization({ userGithubId: userGithubId })
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.message).to.match(/invalid.*job/i)
          done()
        })
    })

    it('should not validate if a `userGithubId` is not passed', done => {
      AddUserToOrganization({ organizationGithubId: orgGithubId })
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.message).to.match(/invalid.*job/i)
          done()
        })
    })

    it('should not validate if a `organizationGithubId` is not a number', done => {
      AddUserToOrganization({ userGithubId: userGithubId, organizationGithubId: 'werwe' })
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.message).to.match(/invalid.*job/i)
          done()
        })
    })

    it('should not validate if a `userGithubId` is not a number', done => {
      AddUserToOrganization({ userGithubId: 'hello', organizationGithubId: orgGithubId })
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.message).to.match(/invalid.*job/i)
          done()
        })
    })

    it('should validate if a valid job is passed', done => {
      AddUserToOrganization(validJob)
        .asCallback(done)
    })
  })

  describe('Errors', () => {
    it('should throw a `WorkerStopError` if a `Organization.fetchByGithubId` throws a `NotFoundError`', done => {
      let thrownErr = new NotFoundError('Organization not found')
      fetchOrgByGithubIdStub.rejects(thrownErr)

      AddUserToOrganization(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.data.err).to.equal(thrownErr)
          done()
        })
    })

    it('should throw a `WorkerStopError` if a `User.fetchByGithubId` throws a `NotFoundError`', done => {
      let thrownErr = new NotFoundError('Organization not found')
      fetchUserByGithubIdStub.rejects(thrownErr)

      AddUserToOrganization(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.data.err).to.equal(thrownErr)
          done()
        })
    })

    it('should throw a `WorkerStopError` if a `Organization.addUser` throws a `UniqueError`', done => {
      let thrownErr = new UniqueError('User already added')
      addUserStub.rejects(thrownErr)

      AddUserToOrganization(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.data.err).to.equal(thrownErr)
          done()
        })
    })

    it('should throw any other error as a normal error', done => {
      let thrownErr = new Error('Unexpected error')
      fetchOrgByGithubIdStub.rejects(thrownErr)

      AddUserToOrganization(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.not.be.an.instanceof(WorkerStopError)
          expect(err).to.equal(thrownErr)
          done()
        })
    })
  })

  describe('Main Functionality', () => {
    it('should fetch the organization by its github id', done => {
      AddUserToOrganization(validJob)
        .then(() => {
          sinon.assert.calledOnce(fetchOrgByGithubIdStub)
          sinon.assert.calledWithExactly(
            fetchOrgByGithubIdStub,
            orgGithubId
          )
        })
        .asCallback(done)
    })

    it('should fetch the user by its github id', done => {
      AddUserToOrganization(validJob)
        .then(() => {
          sinon.assert.calledOnce(fetchUserByGithubIdStub)
          sinon.assert.calledWithExactly(
            fetchUserByGithubIdStub,
            userGithubId
          )
        })
        .asCallback(done)
    })

    it('should add the user to the org', done => {
      AddUserToOrganization(validJob)
        .then(() => {
          sinon.assert.calledOnce(addUserStub)
          let firstCall = addUserStub.firstCall
          sinon.assert.calledWithExactly(
            firstCall,
            user
          )
          expect(firstCall.thisValue).to.equal(org)
        })
        .asCallback(done)
    })
  })
})
