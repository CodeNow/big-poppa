'use strict'

const expect = require('chai').expect
const request = require('supertest-as-promised')
const MockAPI = require('mehpi')

const moment = require('moment')

const testUtil = require('../../util')
const githubOrganizationFixture = require('../../fixtures/github/organization')
const githubUserFixture = require('../../fixtures/github/user')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)

const server = require('http/server')
const route = '/organization'

describe(`HTTP ${route}`, () => {
  let userGithubId = 1981198
  let orgGithubId = 2828361
  let orgId
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
        orgId = res.org[res.org.idAttribute]
      })
  })

  describe('GET /?githubId=GH_ID', () => {
    it('should return a 200 for an existing organization', () => {
      return agent
        .get(`${route}/?githubId=${orgGithubId}`)
        .expect(200)
        .then(res => {
          expect(res).to.be.an.object
          expect(res.body).to.be.an.array
          expect(res.body).to.have.lengthOf(1)
          let org = res.body[0]
          expect(org).to.have.property('id')
          expect(org).to.have.property('githubId', orgGithubId)
          expect(org).to.have.property('trialEnd')
          expect(org).to.have.property('activePeriodEnd')
          expect(org).to.have.property('gracePeriodEnd')
          expect(org).to.have.property('firstDockCreated')
          expect(org).to.have.property('users')
          expect(org.users).to.be.an('array')
          expect(org.users[0]).to.have.property('id')
          expect(org.users[0]).to.have.property('githubId')
        })
    })

    it('should return a an empty array if there are no existing models', () => {
      return agent
        .get(`${route}/?githubId=2343`)
        .expect(200)
        .then(res => {
          expect(res).to.be.an.object
          expect(res.body).to.be.an.array
          expect(res.body).to.have.lengthOf(0)
        })
    })
  })

  describe('GET /:id', () => {
    it('should return a 200 for an existing organization', () => {
      return agent
        .get(`${route}/${orgId}`)
        .expect(200)
        .then(res => {
          expect(res).to.be.an.object
          expect(res.body).to.be.an.object
          let org = res.body
          expect(org).to.have.property('id')
          expect(org).to.have.property('githubId', orgGithubId)
          expect(org).to.have.property('trialEnd')
          expect(org).to.have.property('activePeriodEnd')
          expect(org).to.have.property('gracePeriodEnd')
          expect(org).to.have.property('firstDockCreated')
          expect(org).to.have.property('users')
          expect(org.users).to.be.an('array')
          expect(org.users[0]).to.have.property('id')
          expect(org.users[0]).to.have.property('githubId')
        })
    })

    it('should return a 404 for an non existing organization', () => {
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

  describe('PATCH /:id', () => {
    it('should return a 200 when patching an organization', () => {
      let githubId = 2342342
      let stripeCustomerId = '23423'
      let unixTimestamp = Math.floor((new Date()).getTime() / 1000)
      let time = moment(unixTimestamp, 'X')
      return agent
        .patch(`${route}/${orgId}`)
        .send({
          githubId: githubId,
          stripeCustomerId: stripeCustomerId,
          trialEnd: unixTimestamp,
          activePeriodEnd: unixTimestamp,
          gracePeriodEnd: unixTimestamp
        })
        .expect(200)
        .then(res => {
          return agent
            .get(`${route}/${orgId}`)
            .expect(200)
        })
        .then(res => {
          expect(res).to.be.an.object
          expect(res.body).to.be.an.object
          let org = res.body
          expect(org).to.have.property('id')
          expect(org).to.have.property('githubId', githubId)
          expect(org).to.have.property('stripeCustomerId', stripeCustomerId)
          expect(org).to.have.property('trialEnd', time.format('X'))
          expect(org).to.have.property('activePeriodEnd', time.format('X'))
          expect(org).to.have.property('gracePeriodEnd', time.format('X'))
          expect(org).to.have.property('firstDockCreated', false)
        })
    })

    it('should return a 404 for an non existing organization', () => {
      return agent
        .patch(`${route}/2342`)
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
