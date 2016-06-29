'use strict'

const Promise = require('bluebird')
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const expect = require('chai').expect

const testUtil = require('../../../util')
const GithubAPI = require('common/github')
const bookshelf = require('common/models').bookshelf
const knex = bookshelf.knex

const CreateUser = require('hooray/workers/user.create')

describe('user.create', () => {
  beforeEach(done => {
    sinon.stub(GithubAPI, 'getUser').resolves({ type: 'User' })
    testUtil.trundateAllTables()
     .asCallback(done)
  })

  afterEach(() => {
    GithubAPI.getUser.restore()
  })

  it('should create a user', done => {
    let githubId = 1981198
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
