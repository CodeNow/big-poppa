'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const testUtil = require('../../util')
const githubOrganizationFixture = require('../../fixtures/github/organization')
const MockAPI = require('mehpi')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)

const bookshelf = require('models').bookshelf
const rabbitMQ = require('util/rabbitmq')
const knex = bookshelf.knex

const CreateOrganization = require('workers/organization.create')

describe('Organization.create Functional Test', () => {
  let githubId = 2828361
  let job
  let publishEventStub

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

  beforeEach(() => {
    publishEventStub = sinon.stub(rabbitMQ._rabbit, 'publishEvent')
  })
  afterEach(() => {
    publishEventStub.restore()
  })

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
