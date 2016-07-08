'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect

const testUtil = require('../../util')
const githubOrganizationFixture = require('../../fixtures/github/organization')
const githubUserFixture = require('../../fixtures/github/user')
const MockAPI = require('mehpi')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)

const bookshelf = require('models').bookshelf
const knex = bookshelf.knex

const User = require('models/user')
const Organization = require('models/organization')

const AddUserToOrganization = require('workers/organization.user.add')

describe('organization.user.add', () => {
  let userGithubId = 1981198
  let orgGithubId = 2828361

  before(done => githubAPI.start(done))
  after(done => githubAPI.stop(done))

  beforeEach(done => {
    testUtil.trundateAllTables()
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
        return knex('organization_user').where('user_id', userId).count()
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
      .then(() => knex('organization_user').where('user_id', userId))
      .then(res => {
        expect(res).to.be.an('array')
        expect(res[0]).to.be.an('object')
        expect(res[0].organization_id).to.equal(orgId)
        expect(res[0].user_id).to.equal(userId)
      })
      .asCallback(done)
  })
})
