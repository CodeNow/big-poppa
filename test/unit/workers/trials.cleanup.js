'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))
const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const orion = require('@runnable/orion')

const bookshelf = require('models').bookshelf
const Organization = require('models/organization')

const NotFoundError = require('errors/not-found-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const TrialsCleanupWorker = require('workers/trials.cleanup').task
const TrialsCleanupSchema = require('workers/trials.cleanup').jobSchema

describe('#trials.cleanup', () => {
  let companies
  let org
  let validJob
  let transaction

  let companiesStub
  let fetchOrgByGithubIdStub
  let transactionStub
  let orgSaveStub

  beforeEach(() => {
    org = new Organization({ id: 3, lowerName: 'fakeorg', isActive: true })

    companies = {
      companies: [ {
        type: 'company',
        company_id: 'fakeorg',
        id: '582f554f509d0e1234e8c14f',
        app_id: 'xs5g95pd',
        name: 'fakeorg',
        tags: { type: 'tag.list', tags: [] },
        segments: { type: 'segment.list', segments: [] },
        custom_attributes: { github_id: 10871234 }
      } ],
      pages: {
        page: 1,
        total_pages: 1
      }
    }

    validJob = {}
    transaction = {}
    transactionStub = sinon.stub(bookshelf, 'transaction', (cb) => {
      return Promise.resolve(cb(transaction))
    })
    fetchOrgByGithubIdStub = sinon.stub(Organization, 'fetchByGithubId').resolves({ org })
    orgSaveStub = sinon.stub(Organization.prototype, 'save').resolves()

    companiesStub = sinon.stub(orion.companies, 'listBy').resolves(companies)
  })

  afterEach(() => {
    transactionStub.restore()
    orgSaveStub.restore()
    companiesStub.restore()
    fetchOrgByGithubIdStub.restore()
  })

  describe('Validation', () => {
    it('should validate if a valid job is passed', () => Joi.validateAsync(validJob, TrialsCleanupSchema))
  })

  describe('Errors', () => {
    it('should throw `WorkerStopError` if no orgs are found to kill.', done => {
      companiesStub.resolves()

      TrialsCleanupWorker(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          done()
        })
    })

    it('should throw `WorkerStopError` if `Organization.fetchByGithubId` returns an empty response.', done => {
      let thrownErr = new NotFoundError('Organization not found')
      fetchOrgByGithubIdStub.rejects(thrownErr)

      TrialsCleanupWorker(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          done()
        })
    })
  })

  describe('Main Functionality', () => {
    it('should grab orgs from Intercom segment', () => {
      return TrialsCleanupWorker(validJob)
        .then(() => {
          sinon.assert.calledOnce(fetchOrgByGithubIdStub)
          let firstCall = companiesStub.firstCall
          sinon.assert.calledWith(
            firstCall,
            { segment_id: process.env.INTERCOM_KILLTRIALS_SEGMENT_ID }
          )
        })
    })

    it('should save the isActive: false to the org', () => {
      return TrialsCleanupWorker(validJob)
        .then(() => {
          sinon.assert.calledOnce(orgSaveStub)
          let firstCall = orgSaveStub.firstCall
          sinon.assert.calledWith(
            firstCall,
            { isActive: false }
          )
        })
    })
  })
})
