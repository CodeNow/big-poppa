'use strict'

const Promise = require('bluebird')
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const expect = require('chai').expect

const testUtil = require('../../../util')
const GithubAPI = require('common/github')
const bookshelf = require('common/models').bookshelf
const knex = bookshelf.knex

const CreateOrganization = require('hooray/workers/organization.create')

describe('organization.create', () => {
  beforeEach(done => {
    sinon.stub(GithubAPI, 'getOrganization').resolves({ type: 'Organization' })
    testUtil.trundateAllTables()
     .asCallback(done)
  })

  afterEach(() => {
    GithubAPI.getOrganization.restore()
  })

  it('should create an organization', done => {
    let githubId = 1981198
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
