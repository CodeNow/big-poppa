'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const testUtil = require('../../../util')
const bookshelf = require('common/models').bookshelf
const knex = bookshelf.knex

const GithubAPI = require('common/github')
const User = require('common/models/user')
const Organization = require('common/models/organization')

const AddUserToOrganization = require('hooray/workers/organization.user.add')

describe('organization.user.add', () => {
  let userGithubId = 1981198
  let orgGithubId = 2828361

  beforeEach(done => {
    testUtil.trundateAllTables()
     .asCallback(done)
  })

  beforeEach(done => {
    sinon.stub(GithubAPI, 'getOrganization').resolves({ type: 'Organization' })
    sinon.stub(GithubAPI, 'getUser').resolves({ type: 'User' })
    testUtil.createUserAndOrg(orgGithubId, userGithubId)
      .asCallback(done)
  })

  afterEach(() => {
    GithubAPI.getUser.restore()
    GithubAPI.getOrganization.restore()
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
