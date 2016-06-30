'use strict'

const expect = require('chai').expect

const testUtil = require('../../../util')
const githubUserFixture = require('../../../fixtures/github/user')
const MockAPI = require('mehpi')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)

const bookshelf = require('common/models').bookshelf
const knex = bookshelf.knex

const CreateUser = require('hooray/workers/user.create')

describe('user.create', () => {
  let githubId = 1981198

  before(done => githubAPI.start(done))
  after(done => githubAPI.stop(done))

  beforeEach(done => {
    testUtil.trundateAllTables()
     .asCallback(done)
  })

  beforeEach(() => {
    githubAPI.stub('GET', `/user/${githubId}?access_token=testing`).returns({
      status: 200,
      body: githubUserFixture
    })
  })

  it('should create a user', done => {
    CreateUser({ githubId: githubId }).then((user) => {
      expect(user.get('github_id')).to.equal(githubId)
      // Check database for entry
      return knex('user').where('github_id', githubId)
    })
    .then(res => {
      expect(res).to.have.lengthOf(1)
      expect(res[0]).to.be.an('object')
      expect(res[0].github_id).to.equal(githubId)
    })
      .asCallback(done)
  })
})
