'use strict'

const expect = require('chai').expect

const testUtil = require('../../util')
const githubOrganizationFixture = require('../../fixtures/github/organization')
const MockAPI = require('mehpi')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)

const bookshelf = require('models').bookshelf
const knex = bookshelf.knex

const rabbitMQ = require('util/rabbitmq')
const CreateOrganization = require('workers/organization.create')

describe('organization.create', () => {
  let githubId = 2828361
  let job

  before(done => githubAPI.start(done))
  after(done => githubAPI.stop(done))

  beforeEach(() => {
    job = {
      githubId: githubId,
      creator: {
        githubUsername: 'thejsj',
        email: 'jorge.silva@thejsj.com',
        created: '1469136162'
      }
    }
  })

  beforeEach(done => {
    testUtil.truncateAllTables()
     .asCallback(done)
  })

  beforeEach(() => {
    githubAPI.stub('GET', `/user/${githubId}?access_token=testing`).returns({
      status: 200,
      body: githubOrganizationFixture
    })
  })

  beforeEach(() => rabbitMQ.connect())
  afterEach(() => rabbitMQ.disconnect())

  it('should create an organization', done => {
    CreateOrganization(job).then((organization) => {
      expect(organization.get('githubId')).to.equal(githubId)
      // Check database for entry
      return knex('organizations').where('github_id', githubId)
    })
    .then(res => {
      expect(res).to.have.lengthOf(1)
      expect(res[0]).to.be.an('object')
      expect(res[0].github_id).to.equal(githubId)
    })
      .asCallback(done)
  })
})
