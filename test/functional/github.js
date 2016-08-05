'use strict'
require('loadenv')()

const expect = require('chai').expect

const MockAPI = require('mehpi')
const mockGithubApi = new MockAPI(process.env.GITHUB_VARNISH_PORT)

const GithubAPI = require('util/github')
const githubApi = new GithubAPI()

const githubOrganizationFixture = require('../fixtures/github/organization')
const githubUseFixture = require('../fixtures/github/user')
const githubNotFoundFixture = require('../fixtures/github/not-found')

const GithubEntityNotFoundError = require('errors/github-entity-not-found-error')
const GithubEntityTypeError = require('errors/github-entity-type-error')

describe('GithubAPI Functional Tests', () => {
  before(done => mockGithubApi.start(done))
  after(done => mockGithubApi.stop(done))

  describe('getOrganization', () => {
    let orgGithubId = 2828361

    it('should return a github organization if the organization exists', done => {
      mockGithubApi.stub('GET', `/user/${orgGithubId}?access_token=testing`).returns({
        status: 200,
        body: githubOrganizationFixture
      })

      githubApi.getOrganization(orgGithubId)
        .then(org => {
          expect(org).to.be.an('object')
          expect(org.login).to.equal(githubOrganizationFixture.login)
          expect(org.id).to.equal(githubOrganizationFixture.id)
          expect(org.type).to.equal('Organization')
        })
        .asCallback(done)
    })

    it('should throw a `GithubEntityNotFoundError` if no entity is returned', done => {
      orgGithubId = 999999999 // Doesn't exist
      mockGithubApi.stub('GET', `/user/${orgGithubId}?access_token=testing`).returns({
        status: 404,
        body: githubNotFoundFixture
      })

      githubApi.getOrganization(orgGithubId)
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

      githubApi.getOrganization(orgGithubId)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceOf(GithubEntityTypeError)
          done()
        })
    })
  })

  describe('getUser', () => {
    let userGithubId = 1981198

    it('should return a github organization if the organization exists', done => {
      mockGithubApi.stub('GET', `/user/${userGithubId}?access_token=testing`).returns({
        status: 200,
        body: githubUseFixture
      })

      githubApi.getUser(userGithubId)
        .then(org => {
          expect(org).to.be.an('object')
          expect(org.login).to.equal(githubUseFixture.login)
          expect(org.id).to.equal(githubUseFixture.id)
          expect(org.type).to.equal('User')
        })
        .asCallback(done)
    })

    it('should throw a `GithubEntityNotFoundError` if no entity is returned', done => {
      userGithubId = 999999999 // Doesn't exist
      mockGithubApi.stub('GET', `/user/${userGithubId}?access_token=testing`).returns({
        status: 404,
        body: githubNotFoundFixture
      })

      githubApi.getUser(userGithubId)
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

      githubApi.getUser(userGithubId)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceOf(GithubEntityTypeError)
          done()
        })
    })
  })
})

