'use strict'

const expect = require('chai').expect

const testUtil = require('../../../util')
const githubOrganizationFixture = require('../../../fixtures/github/organization')
const githubUserFixture = require('../../../fixtures/github/user')
const MockAPI = require('mehpi')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)

const bookshelf = require('common/models').bookshelf
const knex = bookshelf.knex

const Organization = require('common/models/organization')

const DeleteOrganization = require('hooray/workers/Organization.delete')

describe('organization.delete', () => {
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
    testUtil.createAttachedUserAndOrg(orgGithubId, userGithubId)
      .asCallback(done)
  })

  it('should delete an organization', done => {
    DeleteOrganization({ githubId: orgGithubId }).then((org) => {
      expect(org.get('github_id')).to.be.undefined
      // Check database for entry
      return knex('organization').where('github_id', orgGithubId)
    })
    .then(res => {
      expect(res).to.have.lengthOf(0)
    })
      .asCallback(done)
  })

  it('should delete an organization with its corresponding associated orgs', done => {
    let orgId
    Organization.fetchByGithubId(orgGithubId)
      .then(org => {
        orgId = org.get(org.idAttribute)
        return knex('organization_user').where('organization_id', orgId).count()
      })
      .then(res => {
        expect(res).to.be.an('array')
        expect(res[0]).to.be.an('object')
        expect(res[0].count).to.have.equal('1')
      })
      .then(() => DeleteOrganization({ githubId: orgGithubId }))
      .then(deletedOrg => {
        expect(deletedOrg.get('github_id')).to.be.undefined
      })
      .then(() => knex('organization_user').where('organization_id', orgId).count())
      .then(res => {
        expect(res).to.be.an('array')
        expect(res[0]).to.be.an('object')
        expect(res[0].count).to.have.equal('0')
      })
      .asCallback(done)
  })
})
