'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const User = require('models/user')

const GithubEntityError = require('errors/github-entity-error')
const UniqueError = require('errors/unique-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const CreateUser = require('workers/user.create')

describe('#user.create', () => {
  let saveStub
  let newUser
  let validJob

  beforeEach(() => {
    validJob = { githubId: 123 }
    newUser = {}
    saveStub = sinon.stub(User.prototype, 'save').resolves(newUser)
  })

  afterEach(() => {
    User.prototype.save.restore()
  })

  describe('Validation', () => {
    it('should throw a validation error if no `githubId` is passed', done => {
      CreateUser({ hello: 'World' })
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.message).to.match(/invalid.*job/i)
          done()
        })
    })

    it('should throw a validation error if the `githubId` is not a number', done => {
      CreateUser({ githubId: 'hello' })
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.message).to.match(/invalid.*job/i)
          done()
        })
    })

    it('should not throw a validation error if a valid job is passed', done => {
      CreateUser(validJob)
        .asCallback(done)
    })
  })

  describe('Errors', () => {
    it('should throw a `WorkerStopError` if a `User.save` throws a `GithubEntityError`', done => {
      let originalErr = new GithubEntityError('hello')
      saveStub.rejects(originalErr)

      CreateUser(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.data.err).to.equal(originalErr)
          expect(err.message).to.match(/fetching.*user.*github/i)
          done()
        })
    })

    it('should throw a `WorkerStopError` if a `User.save` throws a `UniqueError`', done => {
      let originalErr = new UniqueError('hello')
      saveStub.rejects(originalErr)

      CreateUser(validJob)
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
      saveStub.rejects(originalErr)

      CreateUser(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.not.be.an.instanceof(WorkerStopError)
          expect(err).to.equal(originalErr)
          done()
        })
    })
  })

  describe('Main Functionality', done => {
    it('should call `save`', done => {
      CreateUser(validJob)
        .then(() => {
          sinon.assert.calledOnce(saveStub)
          sinon.assert.calledWithExactly(
            saveStub,
            { github_id: validJob.githubId }
          )
        })
        .asCallback(done)
    })

    it('should return a user', done => {
      CreateUser(validJob)
        .then(res => {
          sinon.assert.calledOnce(saveStub)
          expect(res).to.equal(newUser)
        })
        .asCallback(done)
    })
  })
})
