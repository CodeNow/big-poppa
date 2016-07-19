'use strict'

const expect = require('chai').expect
const request = require('supertest-as-promised')

const testUtil = require('../../util')
const githubOrganizationFixture = require('../../fixtures/github/organization')
const githubUserFixture = require('../../fixtures/github/user')
const MockAPI = require('mehpi')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)

const server = require('http/server')
const route = '/user'

describe(`HTTP ${route}`, () => {
  let userGithubId = 1981198
  let orgGithubId = 2828361
  let userId
  let agent

  before(() => {
    agent = request.agent(server.app)
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
        .get(`${route}/?github_id=${userGithubId}`)
        .expect(200)
        .then(res => {
          expect(res).to.be.an.object
          expect(res.body).to.be.an.array
          expect(res.body).to.have.lengthOf(1)
          let user = res.body[0]
          expect(user).to.have.property('id')
          expect(user).to.have.property('github_id', userGithubId)
          expect(user).to.have.property('organizations')
          expect(user.organizations).to.be.an('array')
          expect(user.organizations[0]).to.have.property('id')
          expect(user.organizations[0]).to.have.property('github_id')
        })
    })

    it('should return a an empty array if there are no existing models', () => {
      return agent
        .get(`${route}/?github_id=2343`)
        .expect(200)
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
        .get(`${route}/${userId}`)
        .expect(200)
        .then(res => {
          expect(res).to.be.an.object
          expect(res.body).to.be.an.object
          let user = res.body
          expect(user).to.have.property('id')
          expect(user).to.have.property('github_id', userGithubId)
          expect(user).to.have.property('organizations')
          expect(user.organizations).to.be.an('array')
          expect(user.organizations[0]).to.have.property('id')
          expect(user.organizations[0]).to.have.property('github_id')
        })
    })

    it('should return a 404 for an non existing user', () => {
      return agent
        .get(`${route}/2342`)
        .expect(404)
        .then(res => {
          expect(res).to.be.an.object
          expect(res.body).to.be.an.object
          let err = res.body
          expect(err).to.have.property('err')
        })
    })
  })
})
