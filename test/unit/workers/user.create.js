'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const User = require('models/user')

const GithubEntityError = require('errors/github-entity-error')
const UniqueError = require('errors/unique-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const NotFoundError = require('errors/not-found-error')

const CreateUser = require('workers/user.create')

describe('#user.create', () => {
  let saveStub
  let accessToken = '282398423230239423'
  let newUser
  let validJob
  let userMock
  let fetchByGithubIdStub

  beforeEach(() => {
    validJob = {
      accessToken: accessToken,
      githubId: 123
    }
    newUser = {}
    userMock = new User()
    saveStub = sinon.stub(User.prototype, 'save').resolves(newUser)
    fetchByGithubIdStub = sinon.stub(User, 'fetchByGithubId').rejects(new NotFoundError('not found'))
  })

  afterEach(() => {
    fetchByGithubIdStub.restore()
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
    it('should call `fetchByGithubId`', done => {
      CreateUser(validJob)
        .then(() => {
          sinon.assert.calledOnce(fetchByGithubIdStub)
          sinon.assert.calledWithExactly(
            fetchByGithubIdStub,
            validJob.githubId
          )
        })
        .asCallback(done)
    })

    it('should update the user with the new access token if the user exists', () => {
      fetchByGithubIdStub.resolves(userMock)

      CreateUser(validJob)
        .then(() => {
          sinon.assert.calledOnce(saveStub)
          sinon.assert.calledWithExactly(
            saveStub,
            {
              accessToken: accessToken
            }
          )
        })
        .asCallback(done)
    })

    it('should call `save` if the user doesnt exist', done => {
      CreateUser(validJob)
        .then(() => {
          sinon.assert.calledOnce(saveStub)
          sinon.assert.calledWithExactly(
            saveStub,
            {
              accessToken: validJob.accessToken,
              githubId: validJob.githubId
            }
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
