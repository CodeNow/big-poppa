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

const DeleteUser = require('hooray/workers/user.delete')

describe('user.delete', () => {
  let userGithubId = 1981198
  let orgGithubId = 2828361

  beforeEach(done => {
    testUtil.trundateAllTables()
     .asCallback(done)
  })

  beforeEach(done => {
    sinon.stub(GithubAPI, 'getUser').resolves({ type: 'User' })
    sinon.stub(GithubAPI, 'getOrganization').resolves({ type: 'Organization' })
    testUtil.createAttachedUserAndOrg(orgGithubId, userGithubId)
      .asCallback(done)
  })

  afterEach(() => {
    GithubAPI.getUser.restore()
    GithubAPI.getOrganization.restore()
  })

  it('should delete a user', done => {
    DeleteUser({ githubId: userGithubId }).then((user) => {
      expect(user.get('github_id')).to.be.undefined
      // Check database for entry
      return knex('user').where('github_id', userGithubId)
    })
    .then(res => {
      expect(res).to.have.lengthOf(0)
    })
      .asCallback(done)
  })

  it('should delete a user with its corresponding associated orgs', done => {
    let userId
    User.fetchByGithubId(userGithubId)
      .then(user => {
        userId = user.get(user.idAttribute)
        return knex('organization_user').where('user_id', userId).count()
      })
      .then(res => {
        expect(res).to.be.an('array')
        expect(res[0]).to.be.an('object')
        expect(res[0].count).to.have.equal('1')
      })
      .then(() => DeleteUser({ githubId: userGithubId }))
      .then(deletedUser => {
        expect(deletedUser.get('github_id')).to.be.undefined
      })
      .then(() => knex('organization_user').where('user_id', userId).count())
      .then(res => {
        expect(res).to.be.an('array')
        expect(res[0]).to.be.an('object')
        expect(res[0].count).to.have.equal('0')
      })
      .asCallback(done)
  })
})
