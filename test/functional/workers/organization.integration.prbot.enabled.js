'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const testUtil = require('../../util')
const githubOrganizationFixture = require('../../fixtures/github/organization')
const githubOrgMembershipFixture = require('../../fixtures/github/org-membership')
const githubUserFixture = require('../../fixtures/github/user')
const MockAPI = require('mehpi')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)

const rabbitMQ = require('util/rabbitmq')
const Organization = require('models/organization')

const PrBotEnabled = require('workers/organization.integration.prbot.enabled').task

describe('Organization.integration.prbot.enabled Functional Test', () => {
  let userGithubId = 1981198
  let orgGithubId = 2828361
  let publishEventStub
  before(done => githubAPI.start(done))
  after(done => githubAPI.stop(done))

  beforeEach(done => {
    testUtil.truncateAllTables()
      .asCallback(done)
  })

  beforeEach(done => {
    let orgGithubName = githubOrganizationFixture.login.toLowerCase()
    githubAPI.stub('GET', `/user/${userGithubId}?access_token=testing`).returns({
      status: 200,
      body: githubUserFixture
    })
    githubAPI.stub('GET', `/user/${orgGithubId}?access_token=testing`).returns({
      status: 200,
      body: githubOrganizationFixture
    })
    githubAPI.stub('GET', `/user/memberships/orgs/${orgGithubName}?access_token=testing`).returns({
      status: 200,
      body: githubOrgMembershipFixture
    })
    testUtil.createUserAndOrg(orgGithubId, userGithubId)
      .asCallback(done)
  })

  beforeEach(() => rabbitMQ.connect())
  afterEach(() => rabbitMQ.disconnect())

  beforeEach(() => {
    publishEventStub = sinon.stub(rabbitMQ._rabbit, 'publishEvent')
  })
  afterEach(() => {
    publishEventStub.restore()
  })

  it('should enable prbot on org', done => {
    return Organization.fetchByGithubId(orgGithubId)
      .then(org => {
        return PrBotEnabled({
          organization: {
            id: org.get(org.idAttribute)
          }
        })
      })
      .then(() => {
        return Organization.fetchByGithubId(orgGithubId)
      })
      .then(org => {
        expect(org).to.be.an('object')
        expect(org.get('prBotEnabled')).to.equal(true)
      })
      .asCallback(done)
  })
})
