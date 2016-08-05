'use strict'

const Promise = require('bluebird')
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const expect = require('chai').expect

const bookshelf = require('models').bookshelf
const BaseModel = require('models/base')
const User = require('models/user')

const GithubAPI = require('util/github')
const GithubEntityNotFoundError = require('errors/github-entity-not-found-error')
const githubUserFixture = require('../../fixtures/github/user')

describe('User', () => {
  describe('Prototype Methods', () => {
    let user

    beforeEach(() => {
      user = new User()
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
        user = new User()
        expect(user).to.exist
        sinon.assert.calledOnce(initializeStub)
      })

      it('should set the `creating` listener for saving', () => {
        // Call constructor again to trigger stubs
        user = new User()
        expect(user).to.exist
        sinon.assert.calledOnce(onStub)
        sinon.assert.calledWith(onStub, 'creating', user.validateCreate)
      })
    })

    describe('#organizations', () => {
      let belongsToManyStub

      beforeEach(() => {
        belongsToManyStub = sinon.stub(User.prototype, 'belongsToMany')
      })

      afterEach(() => {
        belongsToManyStub.restore()
      })

      it('should call `belongsToMany`', () => {
        user = new User()
        user.organizations()
        sinon.assert.calledOnce(belongsToManyStub)
        sinon.assert.calledWithExactly(
          belongsToManyStub,
          'Organization'
        )
      })
    })

    describe('#validateCreate', () => {
      let githubId = 123456
      let attrs

      beforeEach(() => {
        attrs = {
          accessToken: 'asdsadasdasdasdasdsadsad',
          githubId: githubId
        }
        sinon.stub(GithubAPI.prototype, 'getUser').resolves(githubUserFixture)
      })

      afterEach(() => {
        GithubAPI.prototype.getUser.restore()
      })

      it('should check if the github id exists and is for a user', done => {
        user.validateCreate({}, attrs)
          .then(() => {
            sinon.assert.calledOnce(GithubAPI.prototype.getUser)
            sinon.assert.calledWithExactly(GithubAPI.prototype.getUser, githubId)
          })
          .asCallback(done)
      })

      it('should throw an error if the user does not exist', done => {
        let githubErr = new GithubEntityNotFoundError(new Error())
        GithubAPI.prototype.getUser.rejects(githubErr)

        let attrs = { githubId: githubId }
        user.validateCreate({}, attrs)
          .asCallback(err => {
            expect(err).to.exist
            expect(err).to.equal(githubErr)
            sinon.assert.calledOnce(GithubAPI.prototype.getUser)
            sinon.assert.calledWithExactly(GithubAPI.prototype.getUser, githubId)
            done()
          })
      })
    })
  })
})
