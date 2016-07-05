'use strict'

const expect = require('chai').expect

const testUtil = require('../../../util')
const githubOrganizationFixture = require('../../../fixtures/github/organization')
const MockAPI = require('mehpi')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)

const bookshelf = require('common/models').bookshelf
const knex = bookshelf.knex

const CreateOrganization = require('prometheus/workers/organization.create')

describe('organization.create', () => {
  let githubId = 2828361

  before(done => githubAPI.start(done))
  after(done => githubAPI.stop(done))

  beforeEach(done => {
    testUtil.trundateAllTables()
     .asCallback(done)
  })

  beforeEach(() => {
    githubAPI.stub('GET', `/user/${githubId}?access_token=testing`).returns({
      status: 200,
      body: githubOrganizationFixture
    })
  })

  it('should create an organization', done => {
    CreateOrganization({ githubId: githubId }).then((organization) => {
      expect(organization.get('github_id')).to.equal(githubId)
      // Check database for entry
      return knex('organization').where('github_id', githubId)
    })
    .then(res => {
      expect(res).to.have.lengthOf(1)
      expect(res[0]).to.be.an('object')
      expect(res[0].github_id).to.equal(githubId)
    })
      .asCallback(done)
  })
})
