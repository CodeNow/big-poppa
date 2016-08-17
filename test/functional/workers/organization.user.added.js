'use strict'

const Promise = require('bluebird')
const sinon = require('sinon')
const moment = require('moment')
require('sinon-as-promised')(Promise)

const testUtil = require('../../util')
const githubOrganizationFixture = require('../../fixtures/github/organization')
const githubOrgMembershipFixture = require('../../fixtures/github/org-membership')
const githubUserFixture = require('../../fixtures/github/user')
const MockAPI = require('mehpi')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)
const orion = require('@runnable/orion')

const rabbitMQ = require('util/rabbitmq')

const User = require('models/user')
const Organization = require('models/organization')

const OrganizationUserAddedWorker = require('workers/organization.user.added').task

describe('Organization.user.added Functional Test', () => {
  let userGithubId = 1981198
  let orgGithubId = 2828361
  let publishEventStub
  let orionUserCreateStub

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
    testUtil.createAttachedUserAndOrg(orgGithubId, userGithubId)
      .asCallback(done)
  })

  beforeEach(() => rabbitMQ.connect())
  afterEach(() => rabbitMQ.disconnect())

  beforeEach(() => {
    publishEventStub = sinon.stub(rabbitMQ._rabbit, 'publishEvent')
    orionUserCreateStub = sinon.stub(orion.users, 'create')
  })
  afterEach(() => {
    publishEventStub.restore()
    orionUserCreateStub.restore()
  })

  it('should add a user to an organization in intercom', done => {
    let userId
    let orgId
    Promise.all([
      User.fetchByGithubId(userGithubId),
      Organization.fetchByGithubId(orgGithubId)
    ])
      .spread((user, organization) => {
        userId = user.get(user.idAttribute)
        orgId = organization.get(organization.idAttribute)
        return OrganizationUserAddedWorker({
          user: {
            id: userId,
            githubId: userGithubId
          },
          organization: {
            id: orgId,
            githubId: orgGithubId
          }
        })
          .then(() => {
            sinon.assert.calledOnce(orionUserCreateStub)
            sinon.assert.calledWithExactly(
              orionUserCreateStub,
              {
                name: githubUserFixture.login,
                email: githubUserFixture.email,
                created_at: +(moment(user.get('created')).format('X')),
                update_last_request_at: true,
                companies: [ {
                  company_id: githubOrganizationFixture.login.toLowerCase(),
                  name: githubOrganizationFixture.login,
                  remote_created_at: sinon.match.number
                } ]
              }
            )
          })
          .asCallback(done)
      })
  })
})
