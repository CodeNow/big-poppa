'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))
const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const User = require('models/user')

const GithubEntityError = require('errors/github-entity-error')
const UniqueError = require('errors/unique-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const UserAuthorized = require('workers/user.authorized').task
const UserAuthorizedSchema = require('workers/user.authorized').jobSchema

describe('#user.authorized', () => {
  let accessToken = '282398423230239423'
  let newUser
  let validJob
  let updateOrCreateByGithubIdStub

  beforeEach(() => {
    validJob = {
      accessToken: accessToken,
      githubId: 123
    }
    newUser = {}
    updateOrCreateByGithubIdStub = sinon.stub(User, 'updateOrCreateByGithubId').resolves(newUser)
  })

  afterEach(() => {
    updateOrCreateByGithubIdStub.restore()
  })
  describe('Validation', () => {
    it('should not validate if a `githubId` is not passed', done => {
      delete validJob.githubId
      Joi.validateAsync(validJob, UserAuthorizedSchema)
        .asCallback(err => {
          expect(err).to.exist
          expect(err.message).to.match(/githubId/i)
          done()
        })
    })

    it('should validate if a valid job is passed', done => {
      Joi.validateAsync(validJob, UserAuthorizedSchema)
        .asCallback(done)
    })
  })

  describe('Errors', () => {
    it('should throw a `WorkerStopError` if a `User.updateOrCreateByGithubIdStub` throws a `GithubEntityError`', done => {
      let originalErr = new GithubEntityError('hello')
      updateOrCreateByGithubIdStub.rejects(originalErr)

      UserAuthorized(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.data.err).to.equal(originalErr)
          expect(err.message).to.match(/fetching.*user.*github/i)
          done()
        })
    })

    it('should throw a `WorkerStopError` if a `User.updateOrCreateByGithubIdStub` throws a `UniqueError`', done => {
      let originalErr = new UniqueError('hello')
      updateOrCreateByGithubIdStub.rejects(originalErr)

      UserAuthorized(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.data.err).to.equal(originalErr)
          expect(err.message).to.match(/user.*already.*exists/i)
          done()
        })
    })

    it('should not throw a `WorkerStopError` if a normal error is thrown', done => {
      let originalErr = new Error('hello')
      updateOrCreateByGithubIdStub.rejects(originalErr)

      UserAuthorized(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.not.be.an.instanceof(WorkerStopError)
          expect(err).to.equal(originalErr)
          done()
        })
    })
  })

  describe('Main Functionality', done => {
    it('should call `updateOrCreateByGithubId`', done => {
      UserAuthorized(validJob)
        .then(() => {
          sinon.assert.calledOnce(updateOrCreateByGithubIdStub)
          sinon.assert.calledWithExactly(
            updateOrCreateByGithubIdStub,
            validJob.githubId,
            validJob.accessToken
          )
        })
        .asCallback(done)
    })
  })
})
