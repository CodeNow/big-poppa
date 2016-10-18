'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const testUtil = require('../../util')
const githubOrganizationFixture = require('../../fixtures/github/organization')
const githubOrgMembershipFixture = require('../../fixtures/github/org-membership')
const githubUserFixture = require('../../fixtures/github/user')
const githubUserFixture2 = require('../../fixtures/github/other-user')
const MockAPI = require('mehpi')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)

const bookshelf = require('models').bookshelf
const rabbitMQ = require('util/rabbitmq')
const knex = bookshelf.knex

const User = require('models/user')
const Organization = require('models/organization')

const ValidationError = require('errors/validation-error')
const AddUserToOrganization = require('workers/organization.user.add').task

describe('Organization.user.add Functional Test', () => {
  let userGithubId = 1981198
  let userGithubId2 = 6379413
  let orgGithubId = 2828361
  let publishEventStub

  before(done => githubAPI.start(done))
  after(done => githubAPI.stop(done))

  beforeEach(done => {
    testUtil.truncateAllTables()
     .asCallback(done)
  })

  beforeEach(() => {
    let orgGithubName = githubOrganizationFixture.login.toLowerCase()
    githubAPI.stub('GET', `/user/${userGithubId}?access_token=testing`).returns({
      status: 200,
      body: githubUserFixture
    })
    githubAPI.stub('GET', `/user/${userGithubId2}?access_token=testing`).returns({
      status: 200,
      body: githubUserFixture2
    })
    githubAPI.stub('GET', `/user/${orgGithubId}?access_token=testing`).returns({
      status: 200,
      body: githubOrganizationFixture
    })
    githubAPI.stub('GET', `/user/memberships/orgs/${orgGithubName}?access_token=testing`).returns({
      status: 200,
      body: githubOrgMembershipFixture
    })
  })

  beforeEach(() => rabbitMQ.connect())
  afterEach(() => rabbitMQ.disconnect())

  beforeEach(() => {
    publishEventStub = sinon.stub(rabbitMQ, 'publishEvent')
  })
  afterEach(() => {
    publishEventStub.restore()
  })

  describe('Organization Account', () => {
    beforeEach(done => {
      testUtil.createUserAndOrg(orgGithubId, userGithubId)
        .asCallback(done)
    })

    it('should add a user to an organization', done => {
      let userId
      let orgId
      Promise.all([
        User.fetchByGithubId(userGithubId),
        Organization.fetchByGithubId(orgGithubId)
      ])
        .spread((user, organization) => {
          userId = user.get(user.idAttribute)
          orgId = organization.get(organization.idAttribute)
          return knex('organizations_users').where('user_id', userId).count()
        })
        .then(res => {
          expect(res).to.be.an('array')
          expect(res[0]).to.be.an('object')
          expect(res[0].count).to.have.equal('0')
        })
        .then(() => AddUserToOrganization({
          userGithubId: userGithubId,
          organizationGithubId: orgGithubId
        }))
        .then(() => knex('organizations_users').where('user_id', userId))
        .then(res => {
          expect(res).to.be.an('array')
          expect(res[0]).to.be.an('object')
          expect(res[0].organization_id).to.equal(orgId)
          expect(res[0].user_id).to.equal(userId)
        })
        .asCallback(done)
    })
  })

  describe('Personal Accounts', () => {
    beforeEach(done => {
      return Promise.all([
        testUtil.createUserAndOrg(userGithubId, userGithubId),
        testUtil.createUser(userGithubId2)
      ])
        .asCallback(done)
    })

    it('should add a user to an personal account organization', done => {
      let userId
      let orgId
      Promise.all([
        User.fetchByGithubId(userGithubId),
        Organization.fetchByGithubId(userGithubId)
      ])
        .spread((user, organization) => {
          userId = user.get(user.idAttribute)
          orgId = organization.get(organization.idAttribute)
          return knex('organizations_users').where('user_id', userId).count()
        })
        .then(res => {
          expect(res).to.be.an('array')
          expect(res[0]).to.be.an('object')
          expect(res[0].count).to.have.equal('0')
        })
        .then(() => AddUserToOrganization({
          userGithubId: userGithubId,
          organizationGithubId: userGithubId
        }))
        .then(() => knex('organizations_users').where('user_id', userId))
        .then(res => {
          expect(res).to.be.an('array')
          expect(res[0]).to.be.an('object')
          expect(res[0].organization_id).to.equal(orgId)
          expect(res[0].user_id).to.equal(userId)
        })
        .asCallback(done)
    })

    it('should not add a user to an personal account organization', done => {
      let userId
      Promise.all([
        User.fetchByGithubId(userGithubId),
        Organization.fetchByGithubId(userGithubId)
      ])
        .spread((user, organization) => {
          userId = user.get(user.idAttribute)
          return knex('organizations_users').where('user_id', userId).count()
        })
        .then(res => {
          expect(res).to.be.an('array')
          expect(res[0]).to.be.an('object')
          expect(res[0].count).to.have.equal('0')
        })
        .then(() => AddUserToOrganization({
          userGithubId: userGithubId2,
          organizationGithubId: userGithubId
        }))
        .catch(err => {
          expect(err).to.be.an.instanceOf(ValidationError)
          expect(err.message).to.match(/github.*user.*allowed/)
        })
        .asCallback(done)
    })
  })
})
