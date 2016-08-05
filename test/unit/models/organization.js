'use strict'

const Promise = require('bluebird')
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const expect = require('chai').expect
const moment = require('moment')

const bookshelf = require('models').bookshelf
const BaseModel = require('models/base')
const Organization = require('models/organization')
const User = require('models/user')

const GithubAPI = require('util/github')
const GithubEntityNotFoundError = require('errors/github-entity-not-found-error')
const githubOrganizationFixture = require('../../fixtures/github/organization')

describe('Organization', () => {
  describe('Prototype Methods', () => {
    let org

    beforeEach(() => {
      org = new Organization()
    })

    describe('#initialize', () => {
      let initializeStub
      let onStub

      beforeEach(() => {
        initializeStub = sinon.stub(BaseModel.prototypeMethods, 'initialize')
        onStub = sinon.stub(bookshelf.Model.prototype, 'on')
      })

      afterEach(() => {
        BaseModel.prototypeMethods.initialize.restore()
        bookshelf.Model.prototype.on.restore()
      })

      it('should call the BaseModel `initialize`', () => {
        // Call constructor again to trigger stubs
        org = new Organization()
        expect(org).to.exist
        sinon.assert.calledOnce(initializeStub)
      })

      it('should set the `creating` listener for saving', () => {
        // Call constructor again to trigger stubs
        org = new Organization()
        expect(org).to.exist
        sinon.assert.calledOnce(onStub)
        sinon.assert.calledWith(onStub, 'creating', org.validateCreate)
      })
    })

    describe('#users', () => {
      let belongsToManyStub

      beforeEach(() => {
        belongsToManyStub = sinon.stub(Organization.prototype, 'belongsToMany')
      })

      afterEach(() => {
        belongsToManyStub.restore()
      })

      it('should call `belongsToMany`', () => {
        org = new Organization()
        org.users()
        sinon.assert.calledOnce(belongsToManyStub)
        sinon.assert.calledWithExactly(
          belongsToManyStub,
          'User'
        )
      })
    })

    describe('#validateCreate', () => {
      let belongsToManyStub
      let githubId = 123456
      let getOrganizationStub
      let attrs

      beforeEach(() => {
        belongsToManyStub = sinon.stub(Organization.prototype, 'belongsToMany')
        attrs = { githubId: githubId }
        getOrganizationStub = sinon.stub(GithubAPI.prototype, 'getOrganization').resolves(githubOrganizationFixture)
      })

      afterEach(() => {
        belongsToManyStub.restore()
        getOrganizationStub.restore()
      })

      it('should call `belongsToMany`', () => {
        org = new Organization()
        org.users()
        sinon.assert.calledOnce(belongsToManyStub)
        sinon.assert.calledWithExactly(
          belongsToManyStub,
          'User'
        )
      })

      it('should check if the github id exists and is for a org', done => {
        org.validateCreate({}, attrs)
          .then(() => {
            sinon.assert.calledOnce(GithubAPI.prototype.getOrganization)
          })
          .asCallback(done)
      })

      it('should throw an error if the org does not exist', done => {
        let githubErr = new GithubEntityNotFoundError(new Error())
        GithubAPI.prototype.getOrganization.rejects(githubErr)
        let attrs = { githubId: githubId }
        org.validateCreate({}, attrs)
          .asCallback(err => {
            expect(err).to.exist
            expect(err).to.equal(githubErr)
            sinon.assert.calledOnce(GithubAPI.prototype.getOrganization)
            sinon.assert.calledWithExactly(GithubAPI.prototype.getOrganization, githubId)
            done()
          })
      })
    })

    describe('#serialize', () => {
      let getCurrentGracePeriodEndStub
      let gracePeriodEnd

      beforeEach(() => {
        gracePeriodEnd = '2016-08-05T21:54:46.093Z'
        getCurrentGracePeriodEndStub = sinon.stub(Organization.prototype, 'getCurrentGracePeriodEnd')
          .returns(gracePeriodEnd)
      })

      afterEach(() => {
        getCurrentGracePeriodEndStub.restore()
      })

      it('should return an object', () => {
        let orgJSON = org.serialize()
        expect(orgJSON).to.be.an('object')
      })

      it('should have a `gracePeriodEnd` method', () => {
        let orgJSON = org.serialize()
        expect(orgJSON.gracePeriodEnd).to.be.a('string')
        expect(orgJSON.gracePeriodEnd).to.equal(gracePeriodEnd)
      })
    })

    describe('#addUser', () => {
      let user
      let usersStub
      let attachStub
      let collectionStub

      beforeEach(() => {
        attachStub = sinon.stub().resolves()
        collectionStub = {
          attach: attachStub
        }
        usersStub = sinon.stub(Organization.prototype, 'users').returns(collectionStub)
        user = new User({ id: Math.floor(Math.random() * 100) })
      })

      afterEach(() => {
        Organization.prototype.users.restore()
      })

      it('should throw a TypeError if no user is passed', done => {
        org.addUser(undefined)
          .asCallback(err => {
            expect(err).to.exist
            expect(err).to.be.an.instanceOf(TypeError)
            expect(err.message).to.match(/user.*instance/i)
            sinon.assert.notCalled(usersStub)
            sinon.assert.notCalled(attachStub)
            done()
          })
      })

      it('should `attach` the user using its id', done => {
        let userId = user.get('id')

        org.addUser(user)
          .then(() => {
            sinon.assert.calledOnce(usersStub)
            expect(usersStub.thisValues[0]).to.equal(org)
            sinon.assert.calledOnce(attachStub)
            sinon.assert.calledWithExactly(attachStub, userId, undefined)
          })
          .asCallback(done)
      })

      it('should pass the `opts` to `attach`', done => {
        let userId = user.get('id')
        let opts = { transacting: {} }

        org.addUser(user, opts)
          .then(() => {
            sinon.assert.calledOnce(usersStub)
            sinon.assert.calledOnce(attachStub)
            sinon.assert.calledWithExactly(attachStub, userId, opts)
          })
          .asCallback(done)
      })

      it('should throw any errors thrown by `attach`', done => {
        let err = new Error()
        attachStub.rejects(err)

        org.addUser(user)
          .asCallback(err => {
            expect(err).to.exist
            sinon.assert.calledOnce(usersStub)
            sinon.assert.calledOnce(attachStub)
            expect(err).to.equal(err)
            done()
          })
      })
    })

    describe('#removeUser', () => {
      let user
      let usersStub
      let detachStub
      let collectionStub

      beforeEach(() => {
        detachStub = sinon.stub().resolves()
        collectionStub = {
          detach: detachStub
        }
        usersStub = sinon.stub(Organization.prototype, 'users').returns(collectionStub)
        user = new User({ id: Math.floor(Math.random() * 100) })
      })

      afterEach(() => {
        Organization.prototype.users.restore()
      })

      it('should throw a TypeError if no user is passed', done => {
        org.removeUser(undefined)
          .asCallback(err => {
            expect(err).to.exist
            expect(err).to.be.an.instanceOf(TypeError)
            expect(err.message).to.match(/user.*instance/i)
            sinon.assert.notCalled(usersStub)
            sinon.assert.notCalled(detachStub)
            done()
          })
      })

      it('should `detach` the user using its id', done => {
        let userId = user.get('id')

        org.removeUser(user)
          .then(() => {
            sinon.assert.calledOnce(usersStub)
            expect(usersStub.thisValues[0]).to.equal(org)
            sinon.assert.calledOnce(detachStub)
            sinon.assert.calledWithExactly(detachStub, userId, undefined)
          })
          .asCallback(done)
      })

      it('should pass the `opts` to `detach`', done => {
        let userId = user.get('id')
        let opts = { transacting: {} }

        org.removeUser(user, opts)
          .then(() => {
            sinon.assert.calledOnce(usersStub)
            sinon.assert.calledOnce(detachStub)
            sinon.assert.calledWithExactly(detachStub, userId, opts)
          })
          .asCallback(done)
      })

      it('should throw any errors thrown by `detach`', done => {
        let err = new Error()
        detachStub.rejects(err)

        org.removeUser(user)
          .asCallback(err => {
            expect(err).to.exist
            sinon.assert.calledOnce(usersStub)
            sinon.assert.calledOnce(detachStub)
            expect(err).to.equal(err)
            done()
          })
      })
    })

    describe('#getCurrentGracePeriodEnd', () => {
      it('should return the end of trial + 72 hours if trial is after active period', () => {
        let trialEnd = moment().add('1', 'weeks')
        let activePeriodEnd = trialEnd.clone().subtract('1', 'minutes')
        org = new Organization({
          trialEnd: trialEnd.toISOString(),
          activePeriodEnd: activePeriodEnd.toISOString()
        })

        let gracePeriodEnd = org.getCurrentGracePeriodEnd()
        let _gracePeriodEnd = trialEnd.clone().add(process.env.GRACE_PERIOD_DURATION_IN_HOURS, 'hours').toISOString()
        expect(gracePeriodEnd).to.equal(_gracePeriodEnd)
      })

      it('should return the end of active period + 72 hours if active period is after trial', () => {
        let trialEnd = moment().add('1', 'weeks')
        let activePeriodEnd = trialEnd.clone().add('1', 'minutes')
        org = new Organization({
          trialEnd: trialEnd.toISOString(),
          activePeriodEnd: activePeriodEnd.toISOString()
        })

        let gracePeriodEnd = org.getCurrentGracePeriodEnd()
        let _gracePeriodEnd = activePeriodEnd.clone().add(process.env.GRACE_PERIOD_DURATION_IN_HOURS, 'hours').toISOString()
        expect(gracePeriodEnd).to.equal(_gracePeriodEnd)
      })

      it('should return the grace period end is set and if after trial or active period + 72 hours', () => {
        let trialEnd = moment().add('1', 'weeks')
        let activePeriodEnd = trialEnd.clone().add('1', 'minutes')
        let setGracePeriodEnd = trialEnd.clone().add('73', 'hours')
        org = new Organization({
          trialEnd: trialEnd.toISOString(),
          activePeriodEnd: activePeriodEnd.toISOString(),
          gracePeriodEnd: setGracePeriodEnd
        })

        let gracePeriodEnd = org.getCurrentGracePeriodEnd()
        let _gracePeriodEnd = setGracePeriodEnd.toISOString()
        expect(gracePeriodEnd).to.equal(_gracePeriodEnd)
      })

      it('should return trial end + 72 hours if more than grace period', () => {
        let trialEnd = moment().add('1', 'weeks')
        let activePeriodEnd = trialEnd.clone().subtract('1', 'minutes')
        let setGracePeriodEnd = trialEnd.clone().add('73', 'hours')
        org = new Organization({
          trialEnd: trialEnd.toISOString(),
          activePeriodEnd: activePeriodEnd.toISOString(),
          gracePeriodEnd: setGracePeriodEnd
        })

        let gracePeriodEnd = org.getCurrentGracePeriodEnd()
        let _gracePeriodEnd = setGracePeriodEnd.toISOString()
        expect(gracePeriodEnd).to.equal(_gracePeriodEnd)
      })

      it('should return active period end + 72 hours if more than grace period', () => {
        let trialEnd = moment().add('1', 'weeks')
        let activePeriodEnd = trialEnd.clone().subtract('1', 'minutes')
        let setGracePeriodEnd = trialEnd.clone().add('10', 'hours')
        org = new Organization({
          trialEnd: trialEnd.toISOString(),
          activePeriodEnd: activePeriodEnd.toISOString(),
          gracePeriodEnd: setGracePeriodEnd
        })

        let gracePeriodEnd = org.getCurrentGracePeriodEnd()
        let _gracePeriodEnd = trialEnd.clone().add(process.env.GRACE_PERIOD_DURATION_IN_HOURS, 'hours').toISOString()
        expect(gracePeriodEnd).to.equal(_gracePeriodEnd)
      })
    })
  })

  describe('Static Methods', () => {
    describe('#create', () => {
      let githubId = 123
      let saveStub

      beforeEach(() => {
        saveStub = sinon.stub(bookshelf.Model.prototype, 'save').resolves()
      })

      afterEach(() => {
        bookshelf.Model.prototype.save.restore()
      })

      it('should save the new organization', done => {
        Organization.create(githubId)
          .then(() => {
            sinon.assert.calledOnce(saveStub)
          })
          .asCallback(done)
      })

      it('should save the new organization with the github id', done => {
        Organization.create(githubId)
          .then(() => {
            sinon.assert.calledOnce(saveStub)
            sinon.assert.calledWithExactly(
              saveStub,
              sinon.match.has('githubId', githubId),
              undefined
            )
          })
          .asCallback(done)
      })

      it('should save the new organization with timestamps for current time', done => {
        let createCompareTime = (before, after) => {
          return time => (before <= time && time <= after)
        }
        let beforeTime = (new Date()).getTime()
        Organization.create(githubId)
          .then(() => {
            sinon.assert.calledOnce(saveStub)
            let dateTypeMatch = sinon.match.instanceOf(Date)
            sinon.assert.calledWithExactly(
              saveStub,
              sinon.match.has('trialEnd', dateTypeMatch)
                .and(sinon.match.has('activePeriodEnd', dateTypeMatch)),
              undefined
            )
            // Assert timestamps were created now
            let afterTime = (new Date()).getTime()
            let compareTime = createCompareTime(beforeTime, afterTime)
            let timeMatch = sinon.match(compareTime)
            sinon.assert.calledWithExactly(
              saveStub,
              sinon.match.has('trialEnd', timeMatch)
                .and(sinon.match.has('activePeriodEnd', timeMatch)),
              undefined
            )
          })
          .asCallback(done)
      })

      it('should call `save` with the passed options', done => {
        let opts = { transacting: {} }
        Organization.create(githubId, opts)
          .then(() => {
            sinon.assert.calledOnce(saveStub)
            sinon.assert.calledWithExactly(
              saveStub,
              sinon.match.object,
              opts
            )
          })
          .asCallback(done)
      })
    })
  })
})
