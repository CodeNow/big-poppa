'use strict'

const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')

const testUtil = require('../../../util')
const githubOrganizationFixture = require('../../../fixtures/github/organization')
const githubUserFixture = require('../../../fixtures/github/user')
const MockAPI = require('mehpi')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)

const bookshelf = require('common/models').bookshelf
const NoRowsDeletedError = require('common/errors/no-rows-deleted-error')
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

  describe('Transactions', () => {
    beforeEach(() => {
      sinon.stub(bookshelf.Model.prototype, 'destroy').rejects(new NoRowsDeletedError())
    })

    afterEach(() => {
      bookshelf.Model.prototype.destroy.restore()
    })

    it('should not commit any database changes if there\'s an error', done => {
      let orgId
      Organization.fetchByGithubId(orgGithubId)
        .then((org) => {
          orgId = org.get(org.idAttribute)
          return DeleteOrganization({ githubId: orgGithubId })
            .then(() => { throw new Error('`DeleteOrganization` should fail') })
        })
        .catch(() => {
          // Check database for entry
          return Promise.all([
            knex('organization').where('id', orgId),
            knex('organization_user').where('organization_id', orgId)
          ])
        })
        .spread((orgRes, relRes) => {
          // Entry for org in database
          expect(orgRes).to.be.an('array')
          expect(orgRes).to.have.lengthOf(1)
          expect(orgRes[0]).to.be.an('object')
          expect(orgRes[0].github_id).to.equal(orgGithubId)
          // Entry for many-to-many relationship in database
          expect(relRes).to.be.an('array')
          expect(relRes).to.have.lengthOf(1)
          expect(relRes[0]).to.be.an('object')
          expect(relRes[0].organization_id).to.equal(orgId)
        })
        .asCallback(done)
    })
  })
})
