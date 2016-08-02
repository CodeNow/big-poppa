'use strict'

const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const testUtil = require('../../util')
const githubOrganizationFixture = require('../../fixtures/github/organization')
const MockAPI = require('mehpi')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)
const User = require('models/user')

const bookshelf = require('models').bookshelf
const knex = bookshelf.knex

const rabbitMQ = require('util/rabbitmq')
const CreateOrganization = require('workers/organization.create')

describe('Organization.create Functional Test', () => {
  let githubId = 2828361
  let userGithubId = 1981198
  let job

  before(done => githubAPI.start(done))
  after(done => githubAPI.stop(done))

  beforeEach(() => {
    job = {
      githubId: githubId,
      creator: {
        githubId: userGithubId,
        githubUsername: 'thejsj',
        email: 'jorge.silva@thejsj.com',
        created: '1469136162'
      }
    }
  })

  beforeEach(done => {
    testUtil.truncateAllTables()
     .asCallback(done)
  })

  beforeEach(() => {
    githubAPI.stub('GET', `/user/${githubId}?access_token=testing`).returns({
      status: 200,
      body: githubOrganizationFixture
    })
    sinon.stub(rabbitMQ, 'publishOrganizationUserAdd').resolves()
  })

  beforeEach(() => {
    return new User().save({
      accessToken: 'testing',
      githubId: userGithubId
    })
  })
  beforeEach(() => rabbitMQ.connect())
  afterEach(() => rabbitMQ.disconnect())

  it('should create an organization, and queue creating a relationship', done => {
    CreateOrganization(job).then((organization) => {
      expect(organization.get('githubId')).to.equal(githubId)
      // Check database for entry
      return knex('organizations').where('github_id', githubId)
    })
      .then(res => {
        expect(res).to.have.lengthOf(1)
        expect(res[0]).to.be.an('object')
        expect(res[0].github_id).to.equal(githubId)
      })
      .then(() => {
        sinon.assert.calledWith(rabbitMQ.publishOrganizationUserAdd, {
          tid: sinon.match.undefined,
          organizationGithubId: job.githubId,
          userGithubId: job.creator.githubId
        })
      })
      .asCallback(done)
  })
})
