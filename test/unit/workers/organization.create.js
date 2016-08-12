'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const orion = require('@runnable/orion')
const moment = require('moment')

const Organization = require('models/organization')
const GithubAPI = require('util/github')
const rabbitMQ = require('util/rabbitmq')

const githubOrganizationFixture = require('../../fixtures/github/organization')
const GithubEntityError = require('errors/github-entity-error')
const UniqueError = require('errors/unique-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const CreateOrganization = require('workers/organization.create')

describe('#organization.create', () => {
  let orgId = 2343243
  let githubId = 123
  let creatorGithubId = 123231
  let creatorUsername = 'thejsj'
  let creatorEmail = 'jorge.silva@thejsj.com'
  let creatorCreated = '2016-07-21T21:22:42+0000'
  let creatorCreatedMoment = moment('2016-07-21T21:22:42+0000')

  let newOrg
  let validJob

  let createStub
  let fetchByGithubIdStub
  let getGithubOrganizationStub
  let publishASGCreateStub
  let publishOrganizationCreatedStub
  let publishOrganizationUserAddStub
  let orionUserCreateStub

  beforeEach(() => {
    validJob = {
      githubId: githubId,
      creator: {
        githubId: creatorGithubId,
        githubUsername: creatorUsername,
        email: creatorEmail,
        created: creatorCreated
      }
    }
    newOrg = {
      id: orgId,
      githubId: githubOrganizationFixture.id,
      name: githubOrganizationFixture.login,
      get: sinon.spy(function (key) {
        return newOrg[key]
      })
    }
    createStub = sinon.stub(Organization, 'create').resolves(newOrg)
    fetchByGithubIdStub = sinon.stub(Organization, 'fetchByGithubId').resolves(newOrg)
    getGithubOrganizationStub = sinon.stub(GithubAPI.prototype, 'getOrganization').resolves(githubOrganizationFixture)
    publishASGCreateStub = sinon.stub(rabbitMQ, 'publishASGCreate')
    publishOrganizationCreatedStub = sinon.stub(rabbitMQ, 'publishOrganizationCreated')
    orionUserCreateStub = sinon.stub(orion.users, 'create')
    publishOrganizationUserAddStub = sinon.stub(rabbitMQ, 'publishOrganizationUserAdd').resolves()
  })

  afterEach(() => {
    createStub.restore()
    fetchByGithubIdStub.restore()
    getGithubOrganizationStub.restore()
    publishASGCreateStub.restore()
    publishOrganizationCreatedStub.restore()
    orionUserCreateStub.restore()
    publishOrganizationUserAddStub.restore()
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
          expect(err.message).to.match(/githubId/i)
          done()
        })
    })

    it('should throw a validation error if no `creator` is passed', done => {
      CreateOrganization({ githubId: 837 })
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.message).to.match(/creator/i)
          done()
        })
    })

    it('should throw a validation error if no `creator.githubUsername` is passed', done => {
      delete validJob.creator.githubUsername
      CreateOrganization(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.message).to.match(/creator.*githubUsername/i)
          done()
        })
    })
    it('should throw a validation error if no `creator.githubId` is passed', done => {
      delete validJob.creator.githubId
      CreateOrganization(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.message).to.match(/invalid.*job/i)
          done()
        })
    })

    it('should throw a validation error if the `creator.githubId` is not a number', done => {
      validJob.creator.githubId = 'dfasdfsadf'
      CreateOrganization(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.message).to.match(/githubId/i)
          done()
        })
    })

    it('should throw a validation error if no `creator.email` is passed', done => {
      delete validJob.creator.email
      CreateOrganization(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.message).to.match(/creator.*email/i)
          done()
        })
    })

    it('should throw a validation error if no `creator.created` is passed', done => {
      delete validJob.creator.created
      CreateOrganization(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.message).to.match(/creator.*created/i)
          done()
        })
    })

    it('should not throw a validation error if a valid job is passed', done => {
      CreateOrganization(validJob)
        .asCallback(done)
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

    it('should return the org if `Organization.create` throws a `UniqueError`', done => {
      let originalErr = new UniqueError('hello')
      createStub.rejects(originalErr)

      CreateOrganization(validJob)
        .then(res => {
          expect(res).to.exist
          expect(res).to.equal(newOrg)
          sinon.assert.calledOnce(fetchByGithubIdStub)
          sinon.assert.calledWithExactly(fetchByGithubIdStub, validJob.githubId)
        })
        .asCallback(done)
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
        .then(() => {
          sinon.assert.calledOnce(createStub)
          sinon.assert.calledWithExactly(
            createStub,
            githubId
          )
          sinon.assert.notCalled(fetchByGithubIdStub)
        })
        .asCallback(done)
    })

    it('should return an organization', done => {
      CreateOrganization(validJob)
        .then(res => {
          sinon.assert.calledOnce(createStub)
          expect(res).to.equal(newOrg)
        })
        .asCallback(done)
    })

    it('should create the org in intercom with the created user', done => {
      CreateOrganization(validJob)
        .then(res => {
          sinon.assert.calledOnce(orionUserCreateStub)
          sinon.assert.calledWithExactly(
            orionUserCreateStub,
            {
              name: creatorUsername,
              email: creatorEmail,
              created_at: +creatorCreatedMoment.format('X'),
              update_last_request_at: true,
              companies: [{
                company_id: githubOrganizationFixture.login.toLowerCase(),
                name: githubOrganizationFixture.login,
                remote_created_at: sinon.match.number
              }]
            }
          )
        })
        .asCallback(done)
    })

    it('should publish an `organization.user.add` job', done => {
      CreateOrganization(validJob)
        .then(res => {
          sinon.assert.calledOnce(publishOrganizationUserAddStub)
          sinon.assert.calledWithExactly(
            publishOrganizationUserAddStub,
            {
              tid: sinon.match.any,
              organizationGithubId: githubId,
              userGithubId: creatorGithubId
            }
          )
        })
        .asCallback(done)
    })

    it('should publish an `asg.create` job', done => {
      CreateOrganization(validJob)
        .then(res => {
          sinon.assert.calledOnce(publishASGCreateStub)
          sinon.assert.calledWithExactly(
            publishASGCreateStub,
            {
              githubId: githubOrganizationFixture.id
            }
          )
        })
        .asCallback(done)
    })

    it('should publish an `organization.created` job', done => {
      CreateOrganization(validJob)
        .then(res => {
          sinon.assert.calledOnce(publishOrganizationCreatedStub)
          sinon.assert.calledWithExactly(
            publishOrganizationCreatedStub,
            {
              organization: {
                id: orgId,
                githubId: githubOrganizationFixture.id,
                name: githubOrganizationFixture.login
              },
              createdAt: sinon.match.string
            }
          )
        })
        .asCallback(done)
    })
  })
})
