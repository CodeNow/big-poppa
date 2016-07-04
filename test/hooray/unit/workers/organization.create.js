'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const Organization = require('common/models/organization')

const GithubEntityError = require('common/errors/github-entity-error')
const UniqueError = require('common/errors/unique-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const CreateOrganization = require('hooray/workers/organization.create')

describe('#orgnization.create', () => {
  let createStub
  let newOrg
  let validJob

  beforeEach(() => {
    validJob = { githubId: 123 }
    newOrg = {}
    createStub = sinon.stub(Organization, 'create').resolves(newOrg)
  })

  afterEach(() => {
    Organization.create.restore()
  })

  describe('Validation', () => {
    it('should throw a validation error if no `githubId` is passed', done => {
      CreateOrganization({ hello: 'World' })
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.message).to.match(/invalid.*job/i)
          done()
        })
    })

    it('should throw a validation error if the `githubId` is not a number', done => {
      CreateOrganization({ githubId: 'hello' })
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.message).to.match(/invalid.*job/i)
          done()
        })
    })

    it('should not throw a validation error if a valid job is passed', done => {
      CreateOrganization(validJob)
        .asCallback(err => {
          expect(err).to.not.exist
          done()
        })
    })
  })

  describe('Errors', () => {
    it('should throw a `WorkerStopError` if a `Organization.create` throws a `GithubEntityError`', done => {
      let originalErr = new GithubEntityError('hello')
      createStub.rejects(originalErr)

      CreateOrganization(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.data.err).to.equal(originalErr)
          expect(err.message).to.match(/fetching.*org.*github/i)
          done()
        })
    })

    it('should throw a `WorkerStopError` if a `Organization.create` throws a `UniqueError`', done => {
      let originalErr = new UniqueError('hello')
      createStub.rejects(originalErr)

      CreateOrganization(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.data.err).to.equal(originalErr)
          expect(err.message).to.match(/already.*exists/i)
          done()
        })
    })

    it('should not throw a `WorkerStopError` if a normal error is thrown', done => {
      let originalErr = new Error('hello')
      createStub.rejects(originalErr)

      CreateOrganization(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.not.be.an.instanceof(WorkerStopError)
          expect(err).to.equal(originalErr)
          done()
        })
    })
  })

  describe('Main Functionality', done => {
    it('should call `Organization.create`', done => {
      CreateOrganization(validJob)
        .asCallback(err => {
          expect(err).to.not.exist
          sinon.assert.calledOnce(createStub)
          sinon.assert.calledWithExactly(
            createStub,
            validJob.githubId
          )
          done()
        })
    })

    it('should return an organization', done => {
      CreateOrganization(validJob)
        .asCallback((err, res) => {
          expect(err).to.not.exist
          sinon.assert.calledOnce(createStub)
          expect(res).to.equal(newOrg)
          done()
        })
    })
  })
})
