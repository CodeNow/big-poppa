'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const testUtil = require('../../util')
const githubOrganizationFixture = require('../../fixtures/github/organization')
const githubUserFixture = require('../../fixtures/github/user')
const githubUserFixture2 = require('../../fixtures/github/user2')
const MockAPI = require('mehpi')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)

const bookshelf = require('models').bookshelf
const NoRowsDeletedError = require('errors/no-rows-deleted-error')
const knex = bookshelf.knex

const User = require('models/user')

const DeleteUser = require('workers/user.delete')

describe('User.delete Functional Test', () => {
  const userGithubId = githubUserFixture.id
  const creatorGithubId = githubUserFixture2.id
  const orgGithubId = githubOrganizationFixture.id

  before(done => githubAPI.start(done))
  after(done => githubAPI.stop(done))

  beforeEach(done => {
    testUtil.truncateAllTables()
     .asCallback(done)
  })

  beforeEach(() => {
    githubAPI.stub('GET', `/user/${userGithubId}?access_token=testing`).returns({
      status: 200,
      body: githubUserFixture
    })
    githubAPI.stub('GET', `/user/${creatorGithubId}?access_token=testing`).returns({
      status: 200,
      body: githubUserFixture
    })
    githubAPI.stub('GET', `/user/${orgGithubId}?access_token=testing`).returns({
      status: 200,
      body: githubOrganizationFixture
    })
    return testUtil.createTwoAttachedUsersAndOrg(orgGithubId, creatorGithubId, userGithubId)
  })

  it('should delete a user', done => {
    DeleteUser({ githubId: userGithubId }).then((user) => {
      expect(user.get('githubId')).to.be.undefined
      // Check database for entry
      return knex('users').where('github_id', userGithubId)
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
        return knex('organizations_users').where('user_id', userId).count()
      })
      .then(res => {
        expect(res).to.be.an('array')
        expect(res[0]).to.be.an('object')
        expect(res[0].count).to.have.equal('1')
      })
      .then(() => DeleteUser({ githubId: userGithubId }))
      .then(deletedUser => {
        expect(deletedUser.get('githubId')).to.be.undefined
      })
      .then(() => knex('organizations_users').where('user_id', userId).count())
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
            knex('users').where('id', userId),
            knex('organizations_users').where('user_id', userId)
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
