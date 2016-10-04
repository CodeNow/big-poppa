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
const PrBotEnabledWorker = require('workers/organization.integration.prbot.enabled').task
const PrBotEnabledSchema = require('workers/organization.integration.prbot.enabled').jobSchema

describe('#organization.integration.prbot.enabled', () => {
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
    validJob = { organization: { id: orgId } }
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

  describe('Errors', () => {
    it('should throw a `WorkerStopError` if a `Organization.fetchByGithubId` throws a `NotFoundError`', done => {
      let thrownErr = new NotFoundError('Organization not found')
      fetchOrgByIdStub.rejects(thrownErr)

      PrBotEnabledWorker(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.data.err).to.equal(thrownErr)
          done()
        })
    })

    it('should throw a `WorkerStopError` if a `org.prBotEnabled` is already true', done => {
      org.set({
        prBotEnabled: true
      })

      PrBotEnabledWorker(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          done()
        })
    })
  })

  describe('Main Functionality', () => {
    it('should fetch the organization by its id', () => {
      return PrBotEnabledWorker(validJob)
        .then(() => {
          sinon.assert.calledOnce(fetchOrgByIdStub)
          sinon.assert.calledWithExactly(
            fetchOrgByIdStub,
            orgId,
            { transacting: transaction }
          )
        })
    })

    it('should save the prBotEnabled: true to the org', () => {
      return PrBotEnabledWorker(validJob)
        .then(() => {
          sinon.assert.calledOnce(orgSaveStub)
          let firstCall = orgSaveStub.firstCall
          sinon.assert.calledWith(
            firstCall,
            { prBotEnabled: true },
            { transacting: transaction }
          )
        })
    })
  })
})
