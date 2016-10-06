'use strict'

const expect = require('chai').expect

const testUtil = require('../../util')
const MockAPI = require('mehpi')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)

const githubUserFixture = require('../../fixtures/github/user')
const githubOrganizationFixture = require('../../fixtures/github/organization')
const githubOrgMembershipFixture = require('../../fixtures/github/org-membership')

const bookshelf = require('models').bookshelf
const knex = bookshelf.knex

const UserAuthorized = require('workers/user.authorized').task

describe('user.authorized Functional Test', () => {
  let githubId = 1981198

  before(done => githubAPI.start(done))
  after(done => githubAPI.stop(done))

  beforeEach(done => {
    testUtil.truncateAllTables()
     .asCallback(done)
  })

  beforeEach(() => {
    githubAPI.stub('GET', `/user/${githubId}?access_token=testing`).returns({
      status: 200,
      body: githubUserFixture
    })
  })

  it('should create a user', done => {
    let accessToken = 'asdsadasdasdasdasdsadsad'
    UserAuthorized({
      accessToken: accessToken,
      githubId: githubId
    }).then((user) => {
      expect(user.get('githubId')).to.equal(githubId)
      // Check database for entry
      return knex('users').where('github_id', githubId)
    })
    .then(res => {
      expect(res).to.have.lengthOf(1)
      expect(res[0]).to.be.an('object')
      expect(res[0].github_id).to.equal(githubId)
      expect(res[0].access_token).to.equal(accessToken)
    })
      .asCallback(done)
  })

  describe('Existing user', () => {
    let userGithubId = 1981198
    let orgGithubId = 2828361

    beforeEach(done => {
      let orgGithubName = githubOrganizationFixture.login.toLowerCase()
      githubAPI.stub('GET', `/user/${userGithubId}?access_token=testing`).returns({
        status: 200,
        body: githubUserFixture
      })
      githubAPI.stub('GET', `/user/${orgGithubId}?access_token=testing`).returns({
        status: 200,
        body: githubOrganizationFixture
      })
      githubAPI.stub('GET', `/user/memberships/orgs/${orgGithubName}?access_token=testing`).returns({
        status: 200,
        body: githubOrgMembershipFixture
      })
      testUtil.createUserAndOrg(orgGithubId, userGithubId)
        .asCallback(done)
    })

    it('should update the access token of the user already exists', done => {
      let accessToken = '8992'
      UserAuthorized({
        accessToken: accessToken,
        githubId: githubId
      }).then((user) => {
        expect(user.get('githubId')).to.equal(githubId)
        // Check database for entry
        return knex('users').where('github_id', githubId)
      })
      .then(res => {
        expect(res).to.have.lengthOf(1)
        expect(res[0]).to.be.an('object')
        expect(res[0].github_id).to.equal(githubId)
        expect(res[0].access_token).to.equal(accessToken)
      })
        .asCallback(done)
    })
  })
})
