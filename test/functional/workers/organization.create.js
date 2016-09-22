'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const testUtil = require('../../util')
const githubOrganizationFixture = require('../../fixtures/github/organization')
const MockAPI = require('mehpi')
// const githubOrganizationFixture = require('../../fixtures/github/organization')
// const githubOrganizationFixture2 = require('../../fixtures/github/organization-2')
const githubUserFixture = require('../../fixtures/github/user')
// const githubOtherUserFixture = require('../../fixtures/github/other-user')
const githubOrgMembershipFixture = require('../../fixtures/github/org-membership')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)

const bookshelf = require('models').bookshelf
const rabbitMQ = require('util/rabbitmq')
const knex = bookshelf.knex

const CreateOrganization = require('workers/organization.create')

describe('Organization.create Functional Test', () => {
  let githubId = githubOrganizationFixture.id
  let userGithubId = githubUserFixture.id
  let orgGithubName = githubOrganizationFixture.login.toLowerCase()
  let job
  let publishEventStub

  before(done => githubAPI.start(done))
  after(done => githubAPI.stop(done))

  beforeEach(() => {
    job = {
      githubId: githubId,
      creator: {
        githubId: userGithubId,
        githubUsername: 'thejsj',
        email: 'jorge.silva@thejsj.com',
        created: '2016-07-21T21:22:42+0000'
      }
    }
  })

  beforeEach('Truncate All Tables', () => testUtil.truncateAllTables())

  beforeEach(() => {
    githubAPI.stub('GET', `/user/${githubId}?access_token=testing`).returns({
      status: 200,
      body: githubOrganizationFixture
    })
  })

  beforeEach('Create user', () => {
    githubAPI.stub('GET', `/user/${userGithubId}?access_token=testing`).returns({
      status: 200,
      body: githubUserFixture
    })
    githubAPI.stub('GET', `/user/memberships/orgs/${orgGithubName}?access_token=testing`).returns({
      status: 200,
      body: githubOrgMembershipFixture
    })
    return testUtil.createUser(userGithubId)
  })

  beforeEach(() => rabbitMQ.connect())
  afterEach(() => rabbitMQ.disconnect())

  beforeEach(() => {
    publishEventStub = sinon.stub(rabbitMQ, 'publishEvent').resolves()
  })

  afterEach(() => {
    publishEventStub.restore()
  })

  it('should create an organization, and queue creating a relationship', done => {
    CreateOrganization(job).then((organization) => {
      expect(organization.get('githubId')).to.equal(githubId)
      // Check database for entry
      return knex('organizations').where('github_id', githubId)
    })
      .then(res => {
        expect(res).to.have.lengthOf(1)
        expect(res[0]).to.be.an('object')
        expect(res[0].name).to.equal(githubOrganizationFixture.login)
        expect(res[0].lower_name).to.equal(githubOrganizationFixture.login.toLowerCase())
      })
      .asCallback(done)
  })
})
