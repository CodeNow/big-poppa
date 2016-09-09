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
const NotFoundError = require('errors/not-found-error')

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

  describe('Static Methods', () => {
    describe('#updateOrCreateByGithubId', () => {
      const githubId = 1234
      const githubAccessToken = 'deadbeef'

      let fetchByGithubIdStub
      let userMock
      let saveStub

      beforeEach(() => {
        userMock = {
          save: sinon.stub().returnsThis()
        }
        fetchByGithubIdStub = sinon.stub(User, 'fetchByGithubId').resolves(userMock)
        saveStub = sinon.stub(User.prototype, 'save').resolves(userMock)
      })

      afterEach(() => {
        fetchByGithubIdStub.restore()
        saveStub.restore()
      })

      it('should fetch user by githubId', () => {
        return User.updateOrCreateByGithubId(githubId, githubAccessToken)
          .then(() => {
            sinon.assert.calledTwice(fetchByGithubIdStub)
            sinon.assert.calledWithExactly(
              fetchByGithubIdStub,
              githubId
            )
            sinon.assert.calledWithExactly(
              fetchByGithubIdStub,
              githubId,
              { withRelated: 'organizations' }
            )
          })
      })

      it('should save the access token on the user if found', () => {
        return User.updateOrCreateByGithubId(githubId, githubAccessToken)
          .then(() => {
            sinon.assert.calledOnce(userMock.save)
            sinon.assert.calledWithExactly(
              userMock.save,
              {
                accessToken: githubAccessToken
              }
            )
          })
      })

      it('should refetch the user after user has been updated', () => {
        return User.updateOrCreateByGithubId(githubId, githubAccessToken)
          .then(() => {
            sinon.assert.callOrder(
              fetchByGithubIdStub,
              userMock.save,
              fetchByGithubIdStub
            )
          })
      })

      it('should resolve the saved user object', () => {
        return User.updateOrCreateByGithubId(githubId, githubAccessToken)
          .then((user) => {
            expect(user).to.equal(userMock)
          })
      })

      it('should create a new user if none is found', () => {
        let err = new NotFoundError('User Not Found')
        fetchByGithubIdStub.onFirstCall().rejects(err)

        return User.updateOrCreateByGithubId(githubId, githubAccessToken)
          .then(() => {
            sinon.assert.calledOnce(saveStub)
            sinon.assert.calledWithExactly(
              saveStub,
              {
                githubId: githubId,
                accessToken: githubAccessToken
              }
            )
          })
      })

      it('should refetch the user after user has been created', () => {
        let err = new NotFoundError('User Not Found')
        fetchByGithubIdStub.onFirstCall().rejects(err)

        return User.updateOrCreateByGithubId(githubId, githubAccessToken)
          .then(() => {
            sinon.assert.callOrder(
              fetchByGithubIdStub,
              saveStub,
              fetchByGithubIdStub
            )
          })
      })
    })
  })
})
