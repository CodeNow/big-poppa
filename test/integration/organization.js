'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect
const superagentPromisePlugin = require('superagent-promise-plugin')
const request = superagentPromisePlugin.patch(require('superagent'))
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const keypather = require('keypather')()

const testUtil = require('../util')
const githubOrganizationFixture = require('../fixtures/github/organization')
const githubOrgMembershipFixture = require('../fixtures/github/org-membership')
const githubUserFixture = require('../fixtures/github/user')
const MockAPI = require('mehpi')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)
const orion = require('@runnable/orion')

const RabbitMQ = require('ponos/lib/rabbitmq')

const workerServer = require('workers/server')
const httpServer = require('http/server')
const User = require('models/user')
const rabbitMQ = require('util/rabbitmq')

describe('Organization Integration Test', () => {
  let orgGithubId = 2828361
  let userGithubId = 1981198
  let publisher
  let publishEventStub
  let orionUserCreateStub

  // Start HTTP Server
  before(() => httpServer.start())
  after(() => httpServer.stop())

  // Start Worker Server
  before(() => workerServer.start())
  after(() => workerServer.stop())

  // Conect to RabbitMQ
  beforeEach(() => {
    publisher = new RabbitMQ({
      name: process.env.APP_NAME + '-test',
      hostname: process.env.RABBITMQ_HOSTNAME,
      port: process.env.RABBITMQ_PORT,
      username: process.env.RABBITMQ_USERNAME,
      password: process.env.RABBITMQ_PASSWORD
    })
    return publisher.connect()
  })
  afterEach(() => publisher.disconnect())

  // Delete everything from the DB after every test
  beforeEach(() => testUtil.truncateAllTables())
  afterEach(() => testUtil.truncateAllTables())

  // Set GH stubs
  before(done => githubAPI.start(done))
  after(done => githubAPI.stop(done))

  beforeEach(() => rabbitMQ.connect())
  afterEach(() => rabbitMQ.disconnect())

  beforeEach(() => {
    publishEventStub = sinon.stub(rabbitMQ, 'publishEvent').resolves()
    orionUserCreateStub = sinon.stub(orion.users, 'create')
  })
  afterEach(() => {
    publishEventStub.restore()
    orionUserCreateStub.restore()
  })

  before(() => {
    let orgGithubName = githubOrganizationFixture.login.toLowerCase()
    githubAPI.stub('GET', `/user/${orgGithubId}?access_token=testing`).returns({
      status: 200,
      body: githubOrganizationFixture
    })
    githubAPI.stub('GET', `/user/${userGithubId}?access_token=testing`).returns({
      status: 200,
      body: githubUserFixture
    })
    githubAPI.stub('GET', `/user/memberships/orgs/${orgGithubName}?access_token=testing`).returns({
      status: 200,
      body: githubOrgMembershipFixture
    })
  })

  beforeEach(() => {
    return new User().save({
      accessToken: process.env.GITHUB_TOKEN || 'testing',
      githubId: userGithubId
    })
  })

  it('should create an organization, and create the org-user relationship', () => {
    return publisher.publishTask('organization.create', {
      githubId: orgGithubId,
      creator: {
        githubId: userGithubId,
        githubUsername: 'thejsj',
        email: 'jorge.silva@thejsj.com',
        created: '2016-07-21T21:22:42+0000'
      }
    })
    .then(() => {
      return testUtil.poll(Promise.method(() => {
        // Make a GET request every 100ms to check if org exists
        return request
          .get(`http://localhost:${process.env.PORT}/organization`)
          .query({ githubId: orgGithubId })
          .then(res => {
            let orgs = res.body
            if (keypather.get(orgs, '[0].users[0]')) {
              expect(orgs).to.have.lengthOf(1)
              const thisOrg = orgs[0]
              expect(thisOrg).to.have.property('id')
              expect(thisOrg).to.have.property('githubId', orgGithubId)
              expect(thisOrg).to.have.property('users')
              expect(thisOrg.users).to.have.lengthOf(1)
              expect(thisOrg.users[0]).to.have.property('id')
              expect(thisOrg.users[0]).to.have.property('githubId', userGithubId)
              return true
            }
            return false
          })
      }), 100, 5000)
    })
  }).timeout(5000)
})
