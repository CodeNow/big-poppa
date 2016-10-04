'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const User = require('models/user')
const Organization = require('models/organization')
const rabbitMQ = require('util/rabbitmq')

const NotFoundError = require('errors/not-found-error')
const NoRowsDeletedError = require('errors/no-rows-deleted-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const RemoveUserFromOrganization = require('workers/organization.user.remove').task

describe('#organization.user.remove', () => {
  let user
  let org
  let userId = 23
  let userGithubId = 678
  let orgId = 12223
  let orgGithubId = 123
  let validJob

  let fetchOrgByGithubIdStub
  let fetchUserByGithubIdStub
  let removeUserStub
  let publishEventStub

  beforeEach(() => {
    user = new User({ id: userId, githubId: userGithubId })
    org = new Organization({ id: orgId, githubId: orgGithubId })
    validJob = { organizationGithubId: orgGithubId, userGithubId: userGithubId }

    fetchOrgByGithubIdStub = sinon.stub(Organization, 'fetchByGithubId').resolves(org)
    fetchUserByGithubIdStub = sinon.stub(User, 'fetchByGithubId').resolves(user)
    removeUserStub = sinon.stub(Organization.prototype, 'removeUser').resolves(user)
    publishEventStub = sinon.stub(rabbitMQ, 'publishEvent')
  })

  afterEach(() => {
    fetchOrgByGithubIdStub.restore()
    fetchUserByGithubIdStub.restore()
    removeUserStub.restore()
    publishEventStub.restore()
  })

  describe('Errors', () => {
    it('should throw a `WorkerStopError` if a `Organization.fetchByGithubId` throws a `NotFoundError`', done => {
      let thrownErr = new NotFoundError('Organization not found')
      fetchOrgByGithubIdStub.rejects(thrownErr)

      RemoveUserFromOrganization(validJob)
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

      RemoveUserFromOrganization(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.data.err).to.equal(thrownErr)
          done()
        })
    })

    it('should throw a `WorkerStopError` if a `Organization.addUser` throws a `NoRowsDeletedError`', done => {
      let thrownErr = new NoRowsDeletedError('User is not part of org')
      removeUserStub.rejects(thrownErr)

      RemoveUserFromOrganization(validJob)
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

      RemoveUserFromOrganization(validJob)
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
      RemoveUserFromOrganization(validJob)
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
      RemoveUserFromOrganization(validJob)
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
      RemoveUserFromOrganization(validJob)
        .then(() => {
          sinon.assert.calledOnce(removeUserStub)
          let firstCall = removeUserStub.firstCall
          sinon.assert.calledWithExactly(
            firstCall,
            user
          )
          expect(firstCall.thisValue).to.equal(org)
        })
        .asCallback(done)
    })

    it('should publish an event with rabbitMQ', () => {
      return RemoveUserFromOrganization(validJob)
        .then(() => {
          sinon.assert.calledOnce(publishEventStub)
          sinon.assert.calledWithExactly(
            publishEventStub,
            'organization.user.removed',
            {
              organization: {
                id: orgId,
                githubId: orgGithubId
              },
              user: {
                id: userId,
                githubId: userGithubId
              }
            }
          )
        })
    })
  })
})
