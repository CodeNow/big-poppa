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
const OrganizationCleanupWorker = require('workers/organization.cleanup').task
const OrganizationCleanupSchema = require('workers/organization.cleanup').jobSchema

describe('#organization.cleanup', () => {
  let org
  let validJob
  let transaction

  let collectionStub
  let queryStub
  let fetchStub
  let transactionStub
  let orgSaveStub

  beforeEach(() => {
    org = new Organization({ id: 3, lowerName: 'p4l-deeznutz', isActive: true })

    validJob = {}
    transaction = {}
    transactionStub = sinon.stub(bookshelf, 'transaction', (cb) => {
      return Promise.resolve(cb(transaction))
    })
    collectionStub = sinon.stub(Organization, 'collection').returnsThis()
    queryStub = sinon.stub(Organization, 'query').returnsThis()
    fetchStub = sinon.stub(Organization, 'fetch').resolves([org])
    orgSaveStub = sinon.stub(Organization.prototype, 'save').resolves(org)
  })

  afterEach(() => {
    transactionStub.restore()
    orgSaveStub.restore()
    collectionStub.restore()
    queryStub.restore()
    fetchStub.restore()
  })

  describe('Validation', () => {
    it('should validate if a valid job is passed', done => {
      Joi.validateAsync(validJob, OrganizationCleanupSchema)
        .asCallback(done)
    })
  })

  describe('Errors', () => {
    it('should throw a `WorkerStopError` if a `Organization.collection.query.fetch` throws a `NotFoundError`', done => {
      let thrownErr = new NotFoundError('Organization not found')
      fetchStub.rejects(thrownErr)

      OrganizationCleanupWorker(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.data.err).to.equal(thrownErr)
          done()
        })
    })
  })

  describe('Main Functionality', () => {
    beforeEach(function () {
      return org.set({
        prBotEnabled: true
      })
    })
    it('should only find orgs that begin with "p4l-*"', () => {
      return OrganizationCleanupWorker(validJob)
        .then(() => {
          sinon.assert.calledOnce(collectionStub)
          sinon.assert.calledOnce(queryStub)
          sinon.assert.calledOnce(fetchStub)
        })
    })

    it('should save the isActive: false to the org', () => {
      return OrganizationCleanupWorker(validJob)
        .then(() => {
          sinon.assert.calledOnce(orgSaveStub)
          let firstCall = orgSaveStub.firstCall
          sinon.assert.calledWith(
            firstCall,
            { isActive: false },
            { transacting: transaction }
          )
        })
    })
  })
})
