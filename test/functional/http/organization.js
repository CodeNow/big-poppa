'use strict'

const BigPoppaClient = require('../../../client')
const expect = require('chai').expect
const MockAPI = require('mehpi')
const moment = require('moment')

const testUtil = require('../../util')
const Organization = require('models/organization')
const githubOrganizationFixture = require('../../fixtures/github/organization')
const githubOrganizationFixture2 = require('../../fixtures/github/organization-2')
const githubUserFixture = require('../../fixtures/github/user')
const githubOtherUserFixture = require('../../fixtures/github/other-user')
const githubOrgMembershipFixture = require('../../fixtures/github/org-membership')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)
const sinon = require('sinon')
const rabbitMQ = require('util/rabbitmq')

const server = require('http/server')

describe('HTTP Organization Functional Test', () => {
  let userGithubId = 1981198
  let otherGithubId = 6379413
  let orgGithubId = 2828361
  let orgId
  let orgName
  let userId
  let agent
  let publishUserAddedToOrganizationStub

  before(() => {
    return server.start()
  })
  before(() => {
    agent = new BigPoppaClient(process.env.BIG_POPPA_HOST)
  })

  after(() => {
    return server.stop()
  })

  before(done => githubAPI.start(done))
  after(done => githubAPI.stop(done))

  beforeEach(() => testUtil.truncateAllTables())

  beforeEach(() => {
    githubAPI.stub('GET', `/user/${userGithubId}?access_token=testing`).returns({
      status: 200,
      body: githubUserFixture
    })
    githubAPI.stub('GET', `/user/${orgGithubId}?access_token=testing`).returns({
      status: 200,
      body: githubOrganizationFixture
    })
    publishUserAddedToOrganizationStub = sinon.stub(rabbitMQ, 'publishUserAddedToOrganization')
    return testUtil.createAttachedUserAndOrg(orgGithubId, userGithubId)
      .then(res => {
        orgId = res.org[res.org.idAttribute]
        orgName = res.org.attributes.name
        userId = res.user[res.user.idAttribute]
      })
  })

  afterEach(() => {
    publishUserAddedToOrganizationStub.restore()
  })

  describe('GET', () => {
    it('should return a 200 for an existing organization', () => {
      return agent
        .getOrganizations({
          githubId: orgGithubId
        })
        .then(orgs => {
          expect(orgs).to.have.lengthOf(1)
          let org = orgs[0]
          expect(org).to.have.property('id')
          expect(org).to.have.property('name', githubOrganizationFixture.login)
          expect(org).to.have.property('githubId', orgGithubId)
          expect(org).to.have.property('trialEnd')
          expect(org).to.have.property('activePeriodEnd')
          expect(org).to.have.property('gracePeriodEnd')
          expect(org).to.have.property('firstDockCreated')
          expect(org).to.have.property('users')
          expect(org.users).to.be.an('array')
          expect(org.users[0]).to.have.property('id')
          expect(org.users[0]).to.have.property('githubId')
          expect(org.users[0]).to.not.have.property('accessToken')
        })
    })

    it('should return a 200 for an existing organization', () => {
      return agent
        .getOrganizations({
          name: orgName
        })
        .then(orgs => {
          expect(orgs).to.have.lengthOf(1)
          let org = orgs[0]
          expect(org).to.have.property('id')
          expect(org).to.have.property('name', githubOrganizationFixture.login)
          expect(org).to.have.property('githubId', orgGithubId)
          expect(org).to.have.property('trialEnd')
          expect(org).to.have.property('activePeriodEnd')
          expect(org).to.have.property('gracePeriodEnd')
          expect(org).to.have.property('firstDockCreated')
          expect(org).to.have.property('users')
          expect(org.users).to.be.an('array')
          expect(org.users[0]).to.have.property('id')
          expect(org.users[0]).to.have.property('githubId')
          expect(org.users[0]).to.not.have.property('accessToken')
        })
    })

    it('should return all of the orgs when not specifying opts', () => {
      return agent
        .getOrganizations()
        .then(body => {
          expect(body).to.be.an.array
          expect(body).to.have.lengthOf(1)
        })
    })

    it('should return a an empty array if there are no existing models', () => {
      return agent
        .getOrganizations({
          githubId: 2343
        })
        .then(body => {
          expect(body).to.be.an.array
          expect(body).to.have.lengthOf(0)
        })
    })

    it('should return an error if an unrecognized property is passed', () => {
      return agent
        .getOrganizations({
          thisPropertyDoesntExist: 2343
        })
        .then(testUtil.throwIfSuccess)
        .catch(err => {
          expect(err).to.exist
          expect(err.message).to.match(/validation.*error/i)
          expect(err.message).to.match(/thisPropertyDoesntExist/i)
        })
    })

    describe.only('Time Queries', () => {
      describe('GET /?trialEndFrom', () => {
        it('should get the org if the trial is more than `trialEndFrom`', () => {
          const time = moment().subtract(1, 'days')
          return agent
            .getOrganizations({
              'trialEnd.moreThan': time.toISOString()
            })
            .then(orgs => {
              expect(orgs).to.be.an.array
              expect(orgs).to.have.lengthOf(1)
              let org = orgs[0]
              expect(org).to.have.property('githubId', orgGithubId)
            })
        })

        it('should get the org if the trial is more than `trialEndFrom`', () => {
          const time = moment().add(7, 'months')
          return agent
            .getOrganizations({
              'trialEnd.moreThan': time.toISOString()
            })
            .then(body => {
              expect(body).to.be.an.array
              expect(body).to.have.lengthOf(0)
            })
        })
      })
    })

    describe('GET /?stripeCustomerId', () => {
      let orgGithubId = 2335750
      let stripeCustomerId = 'cus_2342o3i23'

      beforeEach('Create organization', () => {
        githubAPI.stub('GET', `/user/${orgGithubId}?access_token=testing`).returns({
          status: 200,
          body: githubOrganizationFixture2
        })
        return new Organization().save({
          githubId: orgGithubId,
          trialEnd: new Date(),
          activePeriodEnd: new Date(),
          gracePeriodEnd: new Date(),
          stripeCustomerId: stripeCustomerId
        })
      })

      it('should return a an array with all organizations with a stripeCustomerId', () => {
        return agent
          .getOrganizations({
            stripeCustomerId: stripeCustomerId
          })
          .then(body => {
            expect(body).to.be.an.array
            expect(body).to.have.lengthOf(1)
            expect(body[0]).to.have.property('githubId', orgGithubId)
          })
      })
    })
  })

  describe('GET /:id', () => {
    it('should return a 200 for an existing organization', () => {
      return agent
        .getOrganization(orgId)
        .then(org => {
          expect(org).to.have.property('id')
          expect(org).to.have.property('githubId', orgGithubId)
          expect(org).to.have.property('trialEnd')
          expect(org).to.have.property('activePeriodEnd')
          expect(org).to.have.property('gracePeriodEnd')
          expect(org).to.have.property('firstDockCreated')
          expect(org).to.have.property('users')
          expect(org.users).to.be.an('array')
          expect(org.users[0]).to.have.property('id')
          expect(org.users[0]).to.have.property('githubId')
          expect(org.users[0]).to.not.have.property('accessToken')
        })
    })

    it('should return a 404 for an non existing organization', done => {
      return agent
        .getOrganization(2342)
        .asCallback(err => {
          expect(err).to.be.an.object
          done()
        })
    })
  })

  describe('PATCH /:id', () => {
    it('should return a 200 when patching an organization', () => {
      let githubId = 2342342
      let stripeCustomerId = '23423'
      let timeCreated = new Date()
      let time = moment(timeCreated)
      return agent
        .getOrganization(orgId)
        .then(() => {
          return agent
            .updateOrganization(orgId, {
              githubId: githubId,
              stripeCustomerId: stripeCustomerId,
              trialEnd: timeCreated,
              activePeriodEnd: timeCreated
            })
            // A patch should always return an updated org
            .then(org => {
              expect(org).to.have.property('id')
              expect(org).to.have.property('githubId', githubId)
              expect(org).to.have.property('stripeCustomerId', stripeCustomerId)
              expect(org).to.have.property('trialEnd', time.toISOString())
              expect(org).to.have.property('activePeriodEnd', time.toISOString())
              expect(org).to.have.property('gracePeriodEnd', time.clone().add(72, 'hours').toISOString())
              expect(org).to.have.property('firstDockCreated', false)
            })
        })
    })

    it('should return a 200 when patching the `hasPaymentMethod` property', () => {
      return agent
        .getOrganization(orgId)
        .then(org => {
          expect(org).to.have.property('hasPaymentMethod', false) // Default value
          return agent
            .updateOrganization(orgId, {
              hasPaymentMethod: true
            })
        })
        .then(() => agent.getOrganization(orgId))
        .then(org => {
          expect(org).to.have.property('id', orgId)
          expect(org).to.have.property('hasPaymentMethod', true)
        })
    })

    it('should return a 200 when patching the `metadata` json property', () => {
      return agent
        .getOrganization(orgId)
        .then(org => {
          expect(org).to.have.property('metadata', null) // Default value
          return agent
            .updateOrganization(orgId, {
              metadata: {
                hasAha: true
              }
            })
        })
        .then(() => agent.getOrganization(orgId))
        .then(org => {
          expect(org).to.have.property('id', orgId)
          expect(org).to.have.property('metadata')
          expect(org).to.have.deep.property('metadata.hasAha', true)
        })
    })

    it('should return an error if the property is not a boolean', done => {
      return agent
        .getOrganization(orgId)
        .then(org => {
          return agent
            .updateOrganization(orgId, {
              metadata: {
                hasAha: 'string'
              }
            })
        })
        .asCallback(err => {
          expect(err).to.have.deep.property('data.orignalError.statusCode', 400)
          expect(err.data.orignalError.message).match(/validation.*error/i)
          expect(err.data.orignalError.message).match(/metadata.*aha.*boolean/i)
          done()
        })
    })

    it('should not replace the metadata JSON in the db if the value is invalid', () => {
      return agent.getOrganization(orgId)
        .then(org => {
          return agent
            .updateOrganization(orgId, {
              metadata: {
                hasAha: true
              }
            })
        })
        .then(org => {
          expect(org).to.have.deep.property('metadata.hasAha', true) // Updated value
          return agent
            .updateOrganization(orgId, {
              metadata: {
                totallyBogusProperty: false
              }
            })
        })
        .then(testUtil.throwIfSuccess)
        .catch(err => {
          expect(err).to.exist
          expect(err.message).to.match(/validation.*error/i)
          expect(err.message).to.match(/totallyBogusProperty/i)
        })
    })

    it('should return a 404 for an non existing organization', done => {
      return agent
        .updateOrganization(2342, {})
        .asCallback(err => {
          expect(err).to.be.an.object
          done()
        })
    })
  })

  describe('PATCH /:id/add', () => {
    let otherUser
    let otherToken = process.env.GITHUB_TOKEN || 'testing'
    let orgGithubName = githubOrganizationFixture.login.toLowerCase()
    beforeEach(() => {
      githubAPI.stub('GET', `/user/${otherGithubId}?access_token=testing`).returns({
        status: 200,
        body: githubOtherUserFixture
      })
      githubAPI.stub('GET', `/user/memberships/orgs/${orgGithubName}?access_token=${otherToken}`).returns({
        status: 200,
        body: githubOrgMembershipFixture
      })
      return testUtil.createUser(otherGithubId, otherToken)
        .then(user => {
          otherUser = user
        })
    })

    it('should return a 200 when adding a valid user to an organization', () => {
      return agent
        .addUserToOrganization(orgId, otherUser.id)
        .then(org => {
          expect(org).to.have.property('users')
          expect(org.users).to.be.an('array')
          expect(org.users).to.have.length(2)
          expect(org.users[0]).to.have.property('id')
          expect(org.users[0]).to.have.property('githubId', userGithubId)
          expect(org.users[0]).to.not.have.property('accessToken')
          expect(org.users[1]).to.have.property('id')
          expect(org.users[1]).to.have.property('githubId', otherGithubId)
          expect(org.users[1]).to.not.have.property('accessToken')
        })
    })

    it('should return an error when the user is already part of the org', done => {
      return agent
        .addUserToOrganization(orgId, userId)
        .asCallback(err => {
          expect(err).to.be.an.object
          done()
        })
    })
  })
})
