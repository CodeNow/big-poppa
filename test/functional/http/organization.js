'use strict'

const Promise = require('bluebird')
const BigPoppaClient = require('../../../client')
const expect = require('chai').expect
const MockAPI = require('mehpi')
const moment = require('moment')
const keypather = require('keypather')()

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
  let userGithubId = githubUserFixture.id
  let otherGithubId = 6379413
  let orgGithubId = 2828361
  let orgId
  let orgName
  let userId
  let agent
  let publishEventStub
  let user

  before(() => {
    return server.start()
  })
  before(() => {
    agent = new BigPoppaClient(process.env.BIG_POPPA_HOST)
  })

  after(() => {
    return server.stop()
  })

  beforeEach('Truncate All Tables', () => testUtil.truncateAllTables())

  before(done => githubAPI.start(done))
  after(done => githubAPI.stop(done))

  beforeEach(() => {
    githubAPI.stub('GET', `/user/${userGithubId}?access_token=testing`).returns({
      status: 200,
      body: githubUserFixture
    })
    githubAPI.stub('GET', `/user/${orgGithubId}?access_token=testing`).returns({
      status: 200,
      body: githubOrganizationFixture
    })
    publishEventStub = sinon.stub(rabbitMQ, 'publishEvent')
    return testUtil.createAttachedUserAndOrg(orgGithubId, userGithubId)
      .then(res => {
        orgId = res.org[res.org.idAttribute]
        orgName = res.org.attributes.name
        user = res.user
        userId = user[user.idAttribute]
      })
  })

  afterEach(() => {
    publishEventStub.restore()
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
          expect(org).to.have.property('creator')
          expect(org.creator).to.be.an('object')
          expect(org.creator).to.have.property('id')
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
          expect(org).to.have.property('creator')
          expect(org.creator).to.be.an('object')
          expect(org.creator).to.have.property('id')
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

    describe('Time Queries', () => {
      describe('GET /?trialEnd={ moreThan }', () => {
        it('should get the org if the trial is more than `trialEndFrom`', () => {
          const time = moment().subtract(1, 'days')
          return agent
            .getOrganizations({
              'trialEnd': { moreThan: time.toISOString() }
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
              'trialEnd': { moreThan: time.toISOString() }
            })
            .then(body => {
              expect(body).to.be.an.array
              expect(body).to.have.lengthOf(0)
            })
        })
      })

      describe('GET /?trialEnd={ lessThan }', () => {
        it('should not get the org if the trial is not less than `trialEnd`', () => {
          const time = moment().subtract(1, 'days')
          return agent
            .getOrganizations({
              'trialEnd': { lessThan: time.toISOString() }
            })
            .then(orgs => {
              expect(orgs).to.be.an.array
              expect(orgs).to.have.lengthOf(0)
            })
        })

        it('should get the org if the trial is less than `trialEnd`', () => {
          const time = moment().add(7, 'months')
          return agent
            .getOrganizations({
              'trialEnd': { lessThan: time.toISOString() }
            })
            .then(orgs => {
              expect(orgs).to.be.an.array
              expect(orgs).to.have.lengthOf(1)
              let org = orgs[0]
              expect(org).to.have.property('githubId', orgGithubId)
            })
        })

        it('should get the org if multiple properties are set', () => {
          const time = moment().add(7, 'months')
          return agent
            .getOrganizations({
              githubId: orgGithubId,
              name: orgName,
              'trialEnd': { lessThan: time.toISOString() }
            })
            .then(orgs => {
              expect(orgs).to.be.an.array
              expect(orgs).to.have.lengthOf(1)
              let org = orgs[0]
              expect(org).to.have.property('githubId', orgGithubId)
            })
        })
      })

      describe('Multiple Queries', () => {
        it('should get the org if multiple properties are set', () => {
          const lessThan = moment().add(7, 'months')
          const moreThan = moment().subtract(7, 'months')
          return agent
            .getOrganizations({
              githubId: orgGithubId,
              name: orgName,
              'trialEnd': { lessThan, moreThan }
            })
            .then(orgs => {
              expect(orgs).to.be.an.array
              expect(orgs).to.have.lengthOf(1)
              let org = orgs[0]
              expect(org).to.have.property('githubId', orgGithubId)
            })
        })
      })
    })

    describe('GET /?stripeCustomerId', () => {
      const stripeOrgGithubId = githubOrganizationFixture2.id
      const orgGithubName = githubOrganizationFixture2.login.toLowerCase()
      const stripeCustomerId = 'cus_2342o3i23'

      beforeEach('Create organization', () => {
        githubAPI.stub('GET', `/user/${stripeOrgGithubId}?access_token=testing`).returns({
          status: 200,
          body: githubOrganizationFixture2
        })
        return new Organization().save({
          githubId: stripeOrgGithubId,
          trialEnd: new Date(),
          activePeriodEnd: new Date(),
          gracePeriodEnd: new Date(),
          name: orgGithubName,
          stripeCustomerId: stripeCustomerId,
          creator: user.get(user.idAttribute)
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
            expect(body[0]).to.have.property('githubId', stripeOrgGithubId)
          })
      })

      describe('isNull', () => {
        it('should return the org when querying orgs with a stripeCustomerId', () => {
          return agent
            .getOrganizations({
              stripeCustomerId: { isNull: false }
            })
            .then(body => {
              expect(body).to.be.an.array
              expect(body).to.have.lengthOf(1)
              expect(body[0]).to.have.property('githubId', stripeOrgGithubId)
            })
        })

        it('should return a an empty array if passed', () => {
          return agent
            .getOrganizations({
              stripeCustomerId: { isNull: true }
            })
            .then(body => {
              expect(body).to.be.an.array
              expect(body).to.have.lengthOf(1)
              expect(body[0]).to.have.property('githubId', orgGithubId)
            })
        })
      })
    })
  })

  describe('GET /?stripeSubscriptionId', () => {
    const stripeOrgGithubId = githubOrganizationFixture2.id
    const orgGithubName = githubOrganizationFixture2.login.toLowerCase()
    const stripeSubscriptionId = 'sub_2342o3i23'

    beforeEach('Create organization', () => {
      githubAPI.stub('GET', `/user/${stripeOrgGithubId}?access_token=testing`).returns({
        status: 200,
        body: githubOrganizationFixture2
      })
      return new Organization().save({
        githubId: stripeOrgGithubId,
        trialEnd: new Date(),
        activePeriodEnd: new Date(),
        gracePeriodEnd: new Date(),
        name: orgGithubName,
        stripeSubscriptionId: stripeSubscriptionId,
        creator: user.get(user.idAttribute)
      })
    })

    it('should return a an array with all organizations with a stripeSubscriptionId', () => {
      return agent
        .getOrganizations({
          stripeSubscriptionId: stripeSubscriptionId
        })
        .then(body => {
          expect(body).to.be.an.array
          expect(body).to.have.lengthOf(1)
          expect(body[0]).to.have.property('githubId', stripeOrgGithubId)
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
          expect(org).to.have.property('creator')
          expect(org.creator).to.be.an('object')
          expect(org.creator).to.have.property('id')
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
      let stripeSubscriptionId = 'cus_23423423'
      let timeCreated = new Date()
      let time = moment(timeCreated)
      return agent
        .getOrganization(orgId)
        .then(() => {
          return agent
            .updateOrganization(orgId, {
              githubId: githubId,
              stripeCustomerId: stripeCustomerId,
              stripeSubscriptionId: stripeSubscriptionId,
              trialEnd: timeCreated,
              activePeriodEnd: timeCreated
            })
            // A patch should always return an updated org
            .then(res => {
              let org = res.model
              expect(org).to.have.property('id')
              expect(org).to.have.property('githubId', githubId)
              expect(org).to.have.property('stripeCustomerId', stripeCustomerId)
              expect(org).to.have.property('stripeSubscriptionId', stripeSubscriptionId)
              expect(org).to.have.property('trialEnd', time.toISOString())
              expect(org).to.have.property('activePeriodEnd', time.toISOString())
              expect(org).to.have.property('gracePeriodEnd', time.clone().add(72, 'hours').toISOString())
              expect(org).to.have.property('firstDockCreated', false)
              let updates = res.updates
              expect(updates).to.be.an('object')
              expect(updates).to.have.all.keys([
                'githubId',
                'stripeCustomerId',
                'stripeSubscriptionId',
                'trialEnd',
                'activePeriodEnd',
                'updated_at'
              ])
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
        .then(res => {
          let org = res.model
          expect(org).to.have.property('id', orgId)
          expect(org).to.have.property('hasPaymentMethod', true)
          let updates = res.updates
          expect(updates).to.be.an('object')
          expect(updates).to.have.all.keys(['hasPaymentMethod', 'updated_at'])
        })
    })

    it('should return a 200 when patching the `metadata` json property', () => {
      return agent
        .getOrganization(orgId)
        .then(org => {
          expect(org).to.have.property('metadata')
          expect(org.metadata).to.deep.equal({ hasAha: true }) // Default value
          return agent
            .updateOrganization(orgId, {
              metadata: {
                hasAha: false
              }
            })
        })
        .then(res => {
          let org = res.model
          expect(org).to.have.property('id', orgId)
          expect(org).to.have.property('metadata')
          expect(org).to.have.deep.property('metadata.hasAha', false)
        })
    })

    it('should return the correctly updates for two operations for `hasPaymentMethod`', () => {
      return Promise.all([
        agent.updateOrganization(orgId, { hasPaymentMethod: true }),
        agent.updateOrganization(orgId, { hasPaymentMethod: true })
      ])
      .spread((res1, res2) => {
        let check1 = !!keypather.get(res1, 'updates.hasPaymentMethod')
        let check2 = !!keypather.get(res2, 'updates.hasPaymentMethod')
        // At least one should be true and one should be false
        expect(check1 || check2).to.be.true
        expect(check1 && check2).to.be.false
      })
    })

    it('should return the correctly updates for two operations for `stripeCustomerId`', () => {
      return Promise.all([
        agent.updateOrganization(orgId, { stripeCustomerId: 'abc' }),
        agent.updateOrganization(orgId, { stripeCustomerId: 'abc' })
      ])
      .spread((res1, res2) => {
        let check1 = !!keypather.get(res1, 'updates.stripeCustomerId')
        let check2 = !!keypather.get(res2, 'updates.stripeCustomerId')
        // At least one should be true and one should be false
        expect(check1 || check2).to.be.true
        expect(check1 && check2).to.be.false
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
          expect(err).to.have.deep.property('data.originalError.statusCode', 400)
          expect(err.data.originalError.message).match(/validation.*error/i)
          expect(err.data.originalError.message).match(/metadata.*aha.*boolean/i)
          done()
        })
    })

    it('should not replace the metadata JSON in the db if the property is not specificly specified', () => {
      return agent.getOrganization(orgId)
        .then(org => {
          return agent
            .updateOrganization(orgId, {
              metadata: {
                hasAha: true
              }
            })
        })
        .then(res => {
          let org = res.model
          expect(org).to.have.deep.property('metadata.hasAha', true) // Updated value
          return agent
            .updateOrganization(orgId, {
              metadata: {
                hasConfirmedSetup: true
              }
            })
        })
        .then(function (res) {
          let org = res.model
          expect(org).to.have.deep.property('metadata.hasAha', true)
          expect(org).to.have.deep.property('metadata.hasConfirmedSetup', true)
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
        .then(res => {
          let org = res.model
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
