'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect
const Joi = Promise.promisifyAll(require('joi'))
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const User = require('models/user')
const Organization = require('models/organization')

const NotFoundError = require('errors/not-found-error')
const GithubEntityNoPermissionError = require('errors/github-entity-no-permission-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const GithubAPI = require('util/github')
const moment = require('moment')
const OrganizationUserAddedSchema = require('workers/organization.user.added').schema
const OrganizationUserAddedWorker = require('workers/organization.user.added').task
const orion = require('@runnable/orion')
const githubUserFixture = require('../../fixtures/github/user')

describe('#organization.user.added', () => {
  let user
  let org
  let userId = 23
  let userGithubId = 678
  let orgId = 12223
  let orgGithubId = 123
  let validJob
  let orionUserCreateStub

  let fetchOrgByIdStub
  let fetchUserByIdStub
  let githubApiStub

  beforeEach(() => {
    user = new User({ id: userId, githubId: userGithubId })
    org = new Organization({ id: orgId, githubId: orgGithubId, name: 'org', lowerName: 'org' })
    validJob = {
      organization: {
        githubId: orgGithubId,
        id: orgId
      },
      user: {
        githubId: userGithubId,
        id: userId
      }
    }

    orionUserCreateStub = sinon.stub(orion.users, 'create')
    fetchOrgByIdStub = sinon.stub(Organization, 'fetchById').resolves(org)
    fetchUserByIdStub = sinon.stub(User, 'fetchById').resolves(user)
    githubApiStub = sinon.stub(GithubAPI.prototype, 'getUser').resolves(githubUserFixture)
  })

  afterEach(() => {
    fetchOrgByIdStub.restore()
    fetchUserByIdStub.restore()
    githubApiStub.restore()
    orionUserCreateStub.restore()
  })

  describe('Validation', () => {
    it('should not validate if a `organization.githubId` is not passed', done => {
      delete validJob.organization.githubId
      Joi.validateAsync(validJob, OrganizationUserAddedSchema)
        .asCallback(err => {
          expect(err).to.exist
          expect(err.message).to.match(/githubId/i)
          done()
        })
    })

    it('should not validate if a `organization.id` is not passed', done => {
      delete validJob.organization.id
      Joi.validateAsync(validJob, OrganizationUserAddedSchema)
        .asCallback(err => {
          expect(err).to.exist
          expect(err.message).to.match(/id/i)
          done()
        })
    })

    it('should not validate if a `organization` is not passed', done => {
      delete validJob.organization
      Joi.validateAsync(validJob, OrganizationUserAddedSchema)
        .asCallback(err => {
          expect(err).to.exist
          expect(err.message).to.match(/organization/i)
          done()
        })
    })

    it('should not validate if a `user.githubId` is not passed', done => {
      delete validJob.user.githubId
      Joi.validateAsync(validJob, OrganizationUserAddedSchema)
        .asCallback(err => {
          expect(err).to.exist
          expect(err.message).to.match(/githubId/i)
          done()
        })
    })

    it('should not validate if a `user.id` is not passed', done => {
      delete validJob.user.id
      Joi.validateAsync(validJob, OrganizationUserAddedSchema)
        .asCallback(err => {
          expect(err).to.exist
          expect(err.message).to.match(/id/i)
          done()
        })
    })

    it('should not validate if a `user` is not passed', done => {
      delete validJob.user
      Joi.validateAsync(validJob, OrganizationUserAddedSchema)
        .asCallback(err => {
          expect(err).to.exist
          expect(err.message).to.match(/user/i)
          done()
        })
    })

    it('should not validate if a `organization.githubId` is not a number', done => {
      validJob.organization.githubId = 'asdasdas'
      Joi.validateAsync(validJob, OrganizationUserAddedSchema)
        .asCallback(err => {
          expect(err).to.exist
          expect(err.message).to.match(/a number/i)
          done()
        })
    })

    it('should not validate if a `user.githubId` is not a number', done => {
      validJob.user.githubId = 'asdasdas'
      Joi.validateAsync(validJob, OrganizationUserAddedSchema)
        .asCallback(err => {
          expect(err).to.exist
          expect(err.message).to.match(/a number/i)
          done()
        })
    })

    it('should validate if a valid job is passed', done => {
      Joi.validateAsync(validJob, OrganizationUserAddedSchema)
        .asCallback(done)
    })
  })

  describe('Errors', () => {
    it('should throw a `WorkerStopError` if a `Organization.fetchById` throws a `NotFoundError`', done => {
      let thrownErr = new NotFoundError('Organization not found')
      fetchOrgByIdStub.rejects(thrownErr)

      OrganizationUserAddedWorker(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.data.err).to.equal(thrownErr)
          done()
        })
    })

    it('should throw a `WorkerStopError` if a `User.fetchById` throws a `NotFoundError`', done => {
      let thrownErr = new NotFoundError('Organization not found')
      fetchUserByIdStub.rejects(thrownErr)

      OrganizationUserAddedWorker(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.data.err).to.equal(thrownErr)
          done()
        })
    })

    it('should throw a `WorkerStopError` if a `github.getUser` throws a `GithubEntityNoPermissionError`', done => {
      let thrownErr = new GithubEntityNoPermissionError('User already added')
      githubApiStub.rejects(thrownErr)

      OrganizationUserAddedWorker(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          expect(err.data.err).to.equal(thrownErr)
          done()
        })
    })

    it('should throw any other error as a normal error', done => {
      let thrownErr = new Error('Unexpected error')
      fetchOrgByIdStub.rejects(thrownErr)

      OrganizationUserAddedWorker(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.not.be.an.instanceof(WorkerStopError)
          expect(err).to.equal(thrownErr)
          done()
        })
    })
  })

  describe('Main Functionality', () => {
    it('should fetch the organization by its id', () => {
      return OrganizationUserAddedWorker(validJob)
        .then(() => {
          sinon.assert.calledOnce(fetchOrgByIdStub)
          sinon.assert.calledWithExactly(
            fetchOrgByIdStub,
            orgId
          )
        })
    })

    it('should fetch the user by its id', () => {
      return OrganizationUserAddedWorker(validJob)
        .then(() => {
          sinon.assert.calledOnce(fetchUserByIdStub)
          sinon.assert.calledWithExactly(
            fetchUserByIdStub,
            userId
          )
        })
    })

    it('should fetch the user from github', () => {
      return OrganizationUserAddedWorker(validJob)
        .then(() => {
          sinon.assert.calledOnce(githubApiStub)
          sinon.assert.calledWithExactly(
            githubApiStub,
            userGithubId
          )
        })
    })

    it('should add the user to the org in intercom', () => {
      return OrganizationUserAddedWorker(validJob)
        .then(() => {
          sinon.assert.calledOnce(orionUserCreateStub)
          sinon.assert.calledWithExactly(
            orionUserCreateStub,
            {
              name: githubUserFixture.login,
              email: githubUserFixture.email,
              custom_attributes: {
                user_id: userId
              },
              created_at: +(moment(user.get('created')).format('X')),
              update_last_request_at: true,
              companies: [ {
                company_id: orgId,
                custom_attributes: {
                  github_id: orgGithubId
                },
                name: org.get('name'),
                remote_created_at: sinon.match.number
              } ]
            }
          )
        })
    })
  })
})
