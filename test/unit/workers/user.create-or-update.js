'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const User = require('models/user')

const GithubEntityError = require('errors/github-entity-error')
const UniqueError = require('errors/unique-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const CreateOrUpdateUser = require('workers/user.create-or-update')

describe('#user.create-or-update', () => {
  let accessToken = '282398423230239423'
  let newUser
  let validJob
  let userMock
  let updateOrCreateByGithubIdStub

  beforeEach(() => {
    validJob = {
      accessToken: accessToken,
      githubId: 123
    }
    newUser = {}
    userMock = new User()
    updateOrCreateByGithubIdStub = sinon.stub(User, 'updateOrCreateByGithubId').resolves(newUser)
  })

  afterEach(() => {
    updateOrCreateByGithubIdStub.restore()
  })

  describe('Validation', () => {
    it('should throw a validation error if no `githubId` is passed', done => {
      CreateOrUpdateUser({ hello: 'World' })
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.message).to.match(/invalid.*job/i)
          done()
        })
    })

    it('should throw a validation error if the `githubId` is not a number', done => {
      CreateOrUpdateUser({ githubId: 'hello' })
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.message).to.match(/invalid.*job/i)
          done()
        })
    })

    it('should not throw a validation error if a valid job is passed', done => {
      CreateOrUpdateUser(validJob)
        .asCallback(done)
    })
  })

  describe('Errors', () => {
    it('should throw a `WorkerStopError` if a `User.updateOrCreateByGithubIdStub` throws a `GithubEntityError`', done => {
      let originalErr = new GithubEntityError('hello')
      updateOrCreateByGithubIdStub.rejects(originalErr)

      CreateOrUpdateUser(validJob)
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

      CreateOrUpdateUser(validJob)
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

      CreateOrUpdateUser(validJob)
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

      CreateOrUpdateUser(validJob)
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
