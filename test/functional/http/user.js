'use strict'

const BigPoppaClient = require('../../../client')
const expect = require('chai').expect
const MockAPI = require('mehpi')

const testUtil = require('../../util')
const githubOrganizationFixture = require('../../fixtures/github/organization')
const githubUserFixture = require('../../fixtures/github/user')
const githubUserFixture2 = require('../../fixtures/github/user2')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)

const server = require('http/server')

describe('HTTP User Functional Test', () => {
  let userGithubId = 1981198
  let userGithubId2 = 718305
  let orgGithubId = 2828361
  let userId
  let agent

  before(() => {
    return server.start()
  })
  before(() => {
    agent = new BigPoppaClient(process.env.BIG_POPPA_HOST)
  })

  after(() => {
    return server.stop()
  })

  before(done => githubAPI.start(done))
  after(done => githubAPI.stop(done))

  beforeEach(() => testUtil.truncateAllTables())

  beforeEach(() => {
    githubAPI.stub('GET', `/user/${userGithubId}?access_token=testing`).returns({
      status: 200,
      body: githubUserFixture
    })
    githubAPI.stub('GET', `/user/${orgGithubId}?access_token=testing`).returns({
      status: 200,
      body: githubOrganizationFixture
    })
    githubAPI.stub('GET', `/user/${userGithubId2}?access_token=testing`).returns({
      status: 200,
      body: githubUserFixture2
    })
    return testUtil.createAttachedUserAndOrg(orgGithubId, userGithubId)
      .then(res => {
        userId = res.user[res.user.idAttribute]
      })
  })

  describe('GET /?githubId=GH_ID', () => {
    it('should return a 200 for an existing organization', () => {
      return agent
        .getUsers({
          githubId: userGithubId
        })
        .then(users => {
          expect(users).to.be.an.array
          expect(users).to.have.lengthOf(1)
          let user = users[0]
          expect(user).to.have.property('id')
          expect(user).to.have.property('githubId', userGithubId)
          expect(user).to.have.property('organizations')
          expect(user.organizations).to.be.an('array')
          expect(user.organizations[0]).to.have.property('id')
          expect(user.organizations[0]).to.have.property('githubId')
          expect(user.organizations[0]).to.have.property('allowed')
        })
    })

    it('should return a an empty array if there are no existing models', () => {
      return agent
        .getUsers({
          githubId: 1234
        })
        .then(body => {
          expect(body).to.be.an.array
          expect(body).to.have.lengthOf(0)
        })
    })
  })

  describe('GET /:id', () => {
    it('should return a 200 for an existing user', () => {
      return agent
        .getUser(userId)
        .then(user => {
          expect(user).to.have.property('id')
          expect(user).to.have.property('githubId', userGithubId)
          expect(user).to.have.property('organizations')
          expect(user.organizations).to.be.an('array')
          expect(user.organizations[0]).to.have.property('id')
          expect(user.organizations[0]).to.have.property('githubId')
          expect(user.organizations[0]).to.have.property('allowed')
        })
    })

    it('should return a 404 for an non existing user', () => {
      return agent
        .getUser(2342)
        .catch(err => {
          expect(err).to.be.an.object
        })
    })
  })

  describe('POST /', () => {
    it('should create a new user', () => {
      return agent
        .createOrUpdateUser(userGithubId2, 'abc')
        .then(res => {
          let user = res.model
          expect(user).to.be.an('object')
          expect(user.githubId).to.equal(userGithubId2)
          expect(user.accessToken).to.equal('abc')
        })
    })

    it('should update an already existing user', () => {
      let userId
      return agent
        .createOrUpdateUser(userGithubId2, 'abc')
        .then(res => {
          let user = res.model
          userId = user.id
          expect(user.accessToken).to.equal('abc')
          return agent.createOrUpdateUser(userGithubId2, 'efg')
        })
        .then(res => {
          let user = res.model
          expect(user.accessToken).to.equal('efg')
          return agent.getUser(userId)
        })
        .then(user => {
          expect(user.id).to.equal(userId)
          expect(user.accessToken).to.equal('efg')
        })
    })
  })
})
