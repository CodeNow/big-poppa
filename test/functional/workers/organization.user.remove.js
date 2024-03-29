'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const testUtil = require('../../util')
const githubOrganizationFixture = require('../../fixtures/github/organization')
const githubUserFixture = require('../../fixtures/github/user')
const MockAPI = require('mehpi')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)

const bookshelf = require('models').bookshelf
const rabbitMQ = require('util/rabbitmq')
const knex = bookshelf.knex

const User = require('models/user')
const Organization = require('models/organization')

const RemoveUserFromOrganization = require('workers/organization.user.remove').task

describe('Organization.user.remove Functional Test', () => {
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
    githubAPI.stub('GET', `/user/${userGithubId}?access_token=testing`).returns({
      status: 200,
      body: githubUserFixture
    })
    githubAPI.stub('GET', `/user/${orgGithubId}?access_token=testing`).returns({
      status: 200,
      body: githubOrganizationFixture
    })
    testUtil.createAttachedUserAndOrg(orgGithubId, userGithubId)
      .asCallback(done)
  })

  beforeEach(() => rabbitMQ.connect())
  afterEach(() => rabbitMQ.disconnect())

  beforeEach(() => {
    publishEventStub = sinon.stub(rabbitMQ, 'publishEvent')
  })
  afterEach(() => {
    publishEventStub.restore()
  })

  it('should remove a user from an organization', done => {
    let userId
    let orgId
    Promise.all([
      User.fetchByGithubId(userGithubId),
      Organization.fetchByGithubId(orgGithubId)
    ])
      .spread((user, organization) => {
        userId = user.get(user.idAttribute)
        orgId = organization.get(organization.idAttribute)
        return knex('organizations_users').where('user_id', userId)
      })
      .then(res => {
        expect(res).to.be.an('array')
        expect(res).to.have.lengthOf(1)
        expect(res[0]).to.be.an('object')
        expect(res[0].organization_id).to.equal(orgId)
        expect(res[0].user_id).to.equal(userId)
      })
      .then(() => RemoveUserFromOrganization({
        userGithubId: userGithubId,
        organizationGithubId: orgGithubId
      }))
      .then(() => knex('organizations_users').where('user_id', userId).count())
      .then(res => {
        expect(res).to.be.an('array')
        expect(res[0]).to.be.an('object')
        expect(res[0].count).to.have.equal('0')
      })
      .asCallback(done)
  })
})
