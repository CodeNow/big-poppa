'use strict'
require('loadenv')()

const expect = require('chai').expect

const MockAPI = require('mehpi')
const mockGithubApi = new MockAPI(process.env.GITHUB_VARNISH_PORT)

const GithubAPI = require('util/github')
const githubApi = new GithubAPI()

const githubOrganizationFixture = require('../fixtures/github/organization')
const githubUseFixture = require('../fixtures/github/user')
const githubOrgMembershipFixture = require('../fixtures/github/org-membership')
const githubEmailFixture = require('../fixtures/github/email')
const githubNotFoundFixture = require('../fixtures/github/not-found')

const GithubEntityError = require('errors/github-entity-error')
const GithubEntityNotFoundError = require('errors/github-entity-not-found-error')
const GithubEntityTypeError = require('errors/github-entity-type-error')
const GithubEntityNoPermissionError = require('errors/github-entity-no-permission-error')

describe('GithubAPI Functional Tests', () => {
  before(done => mockGithubApi.start(done))
  after(done => mockGithubApi.stop(done))

  beforeEach(done => {
    mockGithubApi.restore()
    done()
  })
  describe('getOrganization', () => {
    let orgGithubId = 2828361

    it('should return a github organization if the organization exists', () => {
      mockGithubApi.stub('GET', `/user/${orgGithubId}?access_token=testing`).returns({
        status: 200,
        body: githubOrganizationFixture
      })

      return githubApi.getOrganization(orgGithubId)
        .then(org => {
          expect(org).to.be.an('object')
          expect(org.login).to.equal(githubOrganizationFixture.login)
          expect(org.id).to.equal(githubOrganizationFixture.id)
          expect(org.type).to.equal('Organization')
        })
    })

    it('should throw a `GithubEntityNotFoundError` if no entity is returned', done => {
      orgGithubId = 999999999 // Doesn't exist
      mockGithubApi.stub('GET', `/user/${orgGithubId}?access_token=testing`).returns({
        status: 404,
        body: githubNotFoundFixture
      })

      return githubApi.getOrganization(orgGithubId)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceOf(GithubEntityNotFoundError)
          done()
        })
    })

    it('should throw a `GithubEntityTypeError` if the entity is not an organization', done => {
      orgGithubId = 1981198 // user id
      mockGithubApi.stub('GET', `/user/${orgGithubId}?access_token=testing`).returns({
        status: 200,
        body: githubUseFixture
      })

      return githubApi.getOrganization(orgGithubId)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceOf(GithubEntityTypeError)
          done()
        })
    })
  })

  describe('getOrgsForUser', () => {
    let userId = 1981198

    it('should return an array of github organizations ', () => {
      mockGithubApi.stub('GET', '/user/orgs?access_token=testing').returns({
        status: 200,
        body: JSON.stringify([githubOrganizationFixture])
      })

      return githubApi.getOrgsForUser(userId)
        .then(orgs => {
          expect(orgs).to.not.have.lengthOf(0)
          let org = orgs.find(x => x.login === githubOrganizationFixture.login)
          expect(org.login).to.equal(githubOrganizationFixture.login)
          expect(org.id).to.equal(githubOrganizationFixture.id)
        })
    })

    it('should throw a `GithubEntityError` if the fetch fails', done => {
      // Start an instance of GithubAPI with an invalid access token
      let githubApi = new GithubAPI('asdfasd')

      mockGithubApi.stub('GET', '/user/orgs?access_token=testing').returns({
        status: 404,
        body: githubNotFoundFixture
      })
      return githubApi.getOrgsForUser(userId)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceOf(GithubEntityError)
          done()
        })
    })
  })

  describe('getPrimaryEmailAddress', () => {
    let userId = 1981198

    it('should return an array of github organizations ', () => {
      mockGithubApi.stub('GET', '/user/emails?page=0&per_page=100&access_token=testing').returns({
        status: 200,
        body: JSON.stringify(githubEmailFixture)
      })

      return githubApi.getPrimaryEmailAddress(userId)
        .then(email => {
          expect(email).to.equal(githubEmailFixture[0].email)
        })
    })

    it('should throw a `GithubEntityError` if the fetch fails', done => {
      // Start an instance of GithubAPI with an invalid access token
      let githubApi = new GithubAPI('asdfasd')

      mockGithubApi.stub('GET', '/user/emails?page=0&per_page=100&access_token=testing').returns({
        status: 404,
        body: githubNotFoundFixture
      })
      return githubApi.getOrgsForUser(userId)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceOf(GithubEntityError)
          done()
        })
    })
  })

  describe('getUser', () => {
    let userGithubId = 1981198

    it('should return a github organization if the organization exists', () => {
      mockGithubApi.stub('GET', `/user/${userGithubId}?access_token=testing`).returns({
        status: 200,
        body: githubUseFixture
      })

      return githubApi.getUser(userGithubId)
        .then(org => {
          expect(org).to.be.an('object')
          expect(org.login).to.equal(githubUseFixture.login)
          expect(org.id).to.equal(githubUseFixture.id)
          expect(org.type).to.equal('User')
        })
    })

    it('should throw a `GithubEntityNotFoundError` if no entity is returned', done => {
      userGithubId = 999999999 // Doesn't exist
      mockGithubApi.stub('GET', `/user/${userGithubId}?access_token=testing`).returns({
        status: 404,
        body: githubNotFoundFixture
      })

      return githubApi.getUser(userGithubId)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceOf(GithubEntityNotFoundError)
          done()
        })
    })

    it('should throw a `GithubEntityTypeError` if the entity is not an organization', done => {
      userGithubId = 2828361 // organization id
      mockGithubApi.stub('GET', `/user/${userGithubId}?access_token=testing`).returns({
        status: 200,
        body: githubOrganizationFixture
      })

      return githubApi.getUser(userGithubId)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceOf(GithubEntityTypeError)
          done()
        })
    })
  })

  describe('hasUserOrgMembership', () => {
    let orgGithubId = 1981198
    let orgGithubName = githubOrganizationFixture.login

    it('should return a github organization if the organization exists', () => {
      mockGithubApi.stub('GET', `/user/memberships/orgs/${orgGithubName}?access_token=testing`).returns({
        status: 200,
        body: githubOrgMembershipFixture
      })

      return githubApi.hasUserOrgMembership(orgGithubName)
        .then(res => {
          expect(res).to.be.an('object')
          expect(res.user.id).to.deep.equal(githubOrgMembershipFixture.user.id)
          expect(res.user.login).to.deep.equal(githubOrgMembershipFixture.user.login)
          expect(res.user.type).to.deep.equal(githubOrgMembershipFixture.user.type)
        })
    })

    it('should throw a `GithubEntityNoPermissionError` if the call throws anything', done => {
      orgGithubId = 'some-other-org' // Doesn't exist
      mockGithubApi.stub('GET', `/user/memberships/orgs/${orgGithubId}?access_token=testing`).returns({
        status: 404,
        body: githubNotFoundFixture
      })

      return githubApi.hasUserOrgMembership(orgGithubId)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceOf(GithubEntityNoPermissionError)
          done()
        })
    })
  })
})

