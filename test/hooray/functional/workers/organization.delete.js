'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const testUtil = require('../../../util')
const bookshelf = require('common/models').bookshelf
const knex = bookshelf.knex

const GithubAPI = require('common/github')
const Organization = require('common/models/organization')

const DeleteOrganization = require('hooray/workers/Organization.delete')

describe('organization.delete', () => {
  let userGithubId = 1981198
  let orgGithubId = 2828361

  beforeEach(done => {
    testUtil.trundateAllTables()
     .asCallback(done)
  })

  beforeEach(done => {
    sinon.stub(GithubAPI, 'getOrganization').resolves({ type: 'Organization' })
    sinon.stub(GithubAPI, 'getUser').resolves({ type: 'User' })
    testUtil.createAttachedUserAndOrg(orgGithubId, userGithubId)
      .asCallback(done)
  })

  afterEach(() => {
    GithubAPI.getUser.restore()
    GithubAPI.getOrganization.restore()
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
