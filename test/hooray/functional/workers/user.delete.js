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

const User = require('common/models/user')

const DeleteUser = require('hooray/workers/user.delete')

describe('user.delete', () => {
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

  describe('Transactions', () => {
    beforeEach(() => {
      sinon.stub(bookshelf.Model.prototype, 'destroy').rejects(new NoRowsDeletedError())
    })

    afterEach(() => {
      bookshelf.Model.prototype.destroy.restore()
    })

    it('should not commit any database changes if there\'s an error', done => {
      let userId
      User.fetchByGithubId(userGithubId)
        .then((user) => {
          userId = user.get(user.idAttribute)
          return DeleteUser({ githubId: userGithubId })
            .then(() => { throw new Error('`DeleteUser` should fail') })
        })
        .catch(() => {
          // Check database for entry
          return Promise.all([
            knex('user').where('id', userId),
            knex('organization_user').where('user_id', userId)
          ])
        })
        .spread((userRes, relRes) => {
          // Entry for user in database
          expect(userRes).to.be.an('array')
          expect(userRes).to.have.lengthOf(1)
          expect(userRes[0]).to.be.an('object')
          expect(userRes[0].github_id).to.equal(userGithubId)
          // Entry for many-to-many relationship in database
          expect(relRes).to.be.an('array')
          expect(relRes).to.have.lengthOf(1)
          expect(relRes[0]).to.be.an('object')
          expect(relRes[0].user_id).to.equal(userId)
        })
        .asCallback(done)
    })
  })
})
