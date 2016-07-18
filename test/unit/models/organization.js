'use strict'

const Promise = require('bluebird')
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const expect = require('chai').expect

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

    describe('#validateCreate', () => {
      let githubId = 123456
      let attrs

      beforeEach(() => {
        attrs = { github_id: githubId }
        sinon.stub(GithubAPI, 'getOrganization').resolves(githubOrganizationFixture)
      })

      afterEach(() => {
        GithubAPI.getOrganization.restore()
      })

      it('should check if the github id exists and is for a org', done => {
        org.validateCreate({}, attrs)
          .then(() => {
            sinon.assert.calledOnce(GithubAPI.getOrganization)
            sinon.assert.calledWithExactly(GithubAPI.getOrganization, githubId)
          })
          .asCallback(done)
      })

      it('should throw an error if the org does not exist', done => {
        let githubErr = new GithubEntityNotFoundError(new Error())
        GithubAPI.getOrganization.rejects(githubErr)

        let attrs = { github_id: githubId }
        org.validateCreate({}, attrs)
          .asCallback(err => {
            expect(err).to.exist
            expect(err).to.equal(githubErr)
            sinon.assert.calledOnce(GithubAPI.getOrganization)
            sinon.assert.calledWithExactly(GithubAPI.getOrganization, githubId)
            done()
          })
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
              sinon.match.has('github_id', githubId),
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
              sinon.match.has('trial_end', dateTypeMatch)
                .and(sinon.match.has('active_period_end', dateTypeMatch))
                .and(sinon.match.has('grace_period_end', dateTypeMatch)),
              undefined
            )
            // Assert timestamps were created now
            let afterTime = (new Date()).getTime()
            let compareTime = createCompareTime(beforeTime, afterTime)
            let timeMatch = sinon.match(compareTime)
            sinon.assert.calledWithExactly(
              saveStub,
              sinon.match.has('trial_end', timeMatch)
                .and(sinon.match.has('active_period_end', timeMatch))
                .and(sinon.match.has('grace_period_end', timeMatch)),
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