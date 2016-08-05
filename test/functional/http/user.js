'use strict'

const BigPoppaClient = require('../../../client')
const expect = require('chai').expect
const MockAPI = require('mehpi')

const testUtil = require('../../util')
const githubOrganizationFixture = require('../../fixtures/github/organization')
const githubUserFixture = require('../../fixtures/github/user')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)

const server = require('http/server')

describe('HTTP User Functional Test', () => {
  let userGithubId = 1981198
  let orgGithubId = 2828361
  let userId
  let agent

  before(() => {
    return server.start()
  })
  before(() => {
    agent = new BigPoppaClient()
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
        .then(res => {
          expect(res).to.be.an.object
          expect(res.statusCode).to.equal(200)
          expect(res.body).to.be.an.array
          expect(res.body).to.have.lengthOf(1)
          let user = res.body[0]
          expect(user).to.have.property('id')
          expect(user).to.have.property('githubId', userGithubId)
          expect(user).to.have.property('organizations')
          expect(user.organizations).to.be.an('array')
          expect(user.organizations[0]).to.have.property('id')
          expect(user.organizations[0]).to.have.property('githubId')
        })
    })

    it('should return a an empty array if there are no existing models', () => {
      return agent
        .getUsers({
          githubId: 1234
        })
        .then(res => {
          expect(res).to.be.an.object
          expect(res.body).to.be.an.array
          expect(res.body).to.have.lengthOf(0)
        })
    })
  })

  describe('GET /:id', () => {
    it('should return a 200 for an existing user', () => {
      return agent
        .getUser(userId)
        .then(res => {
          expect(res).to.be.an.object
          expect(res.statusCode).to.equal(200)
          expect(res.body).to.be.an.object
          let user = res.body
          expect(user).to.have.property('id')
          expect(user).to.have.property('githubId', userGithubId)
          expect(user).to.have.property('organizations')
          expect(user.organizations).to.be.an('array')
          expect(user.organizations[0]).to.have.property('id')
          expect(user.organizations[0]).to.have.property('githubId')
        })
    })

    it('should return a 404 for an non existing user', () => {
      return agent
        .getUser(2342)
        .then(res => {
          expect(res).to.be.an.object
          expect(res.statusCode).to.equal(404)
          expect(res.body).to.be.an.object
          let err = res.body
          expect(err).to.have.property('err')
        })
    })
  })
})
