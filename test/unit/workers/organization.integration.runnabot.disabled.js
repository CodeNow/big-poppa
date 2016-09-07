'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))
const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const bookshelf = require('models').bookshelf
const Organization = require('models/organization')

const NotFoundError = require('errors/not-found-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const RunnabotDisabledWorker = require('workers/organization.integration.runnabot.disabled').task
const RunnabotDisabledSchema = require('workers/organization.integration.runnabot.disabled').jobSchema

describe('#organization.integration.runnabot.disabled', () => {
  let org
  let orgId = 12223
  let orgGithubId = 123
  let validJob
  let transaction

  let fetchOrgByIdStub
  let transactionStub
  let orgSaveStub

  beforeEach(() => {
    org = new Organization({ id: orgId, githubId: orgGithubId })
    validJob = { organizationId: orgId }
    transaction = {}
    transactionStub = sinon.stub(bookshelf, 'transaction', (cb) => {
      return Promise.resolve(cb(transaction))
    })
    fetchOrgByIdStub = sinon.stub(Organization, 'fetchById').resolves(org)
    orgSaveStub = sinon.stub(Organization.prototype, 'save').resolves(org)
  })

  afterEach(() => {
    transactionStub.restore()
    orgSaveStub.restore()
    fetchOrgByIdStub.restore()
  })

  describe('Validation', () => {
    it('should not validate if a `organizationId` is not passed', done => {
      delete validJob.organizationId
      Joi.validateAsync(validJob, RunnabotDisabledSchema)
        .asCallback(err => {
          expect(err).to.exist
          expect(err.message).to.match(/organizationId/i)
          done()
        })
    })

    it('should validate if a valid job is passed', done => {
      Joi.validateAsync(validJob, RunnabotDisabledSchema)
        .asCallback(done)
    })
  })

  describe('Errors', () => {
    it('should throw a `WorkerStopError` if a `Organization.fetchByGithubId` throws a `NotFoundError`', done => {
      let thrownErr = new NotFoundError('Organization not found')
      fetchOrgByIdStub.rejects(thrownErr)

      RunnabotDisabledWorker(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.data.err).to.equal(thrownErr)
          done()
        })
    })

    it('should throw a `WorkerStopError` if a `org.runnabotEnabled` is already false', done => {
      RunnabotDisabledWorker(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          done()
        })
    })
  })

  describe('Main Functionality', () => {
    beforeEach(function () {
      return org.set({
        runnabotEnabled: true
      })
    })
    it('should fetch the organization by its id', () => {
      return RunnabotDisabledWorker(validJob)
        .then(() => {
          sinon.assert.calledOnce(fetchOrgByIdStub)
          sinon.assert.calledWithExactly(
            fetchOrgByIdStub,
            orgId,
            { transacting: transaction }
          )
        })
    })

    it('should save the runnabotEnabled: false to the org', () => {
      return RunnabotDisabledWorker(validJob)
        .then(() => {
          sinon.assert.calledOnce(orgSaveStub)
          let firstCall = orgSaveStub.firstCall
          sinon.assert.calledWith(
            firstCall,
            { runnabotEnabled: false },
            { transacting: transaction }
          )
        })
    })
  })
})
