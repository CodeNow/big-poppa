'use strict'

const Promise = require('bluebird')
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const expect = require('chai').expect

const bookshelf = require('common/models').bookshelf
const BaseModel = require('common/models/base')
const User = require('common/models/user')

const GithubAPI = require('common/github')
const GithubEntityNotFoundError = require('common/errors/github-entity-not-found-error')
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
        sinon.stub(BaseModel.prototypeMethods, 'initialize')
        initializeStub = BaseModel.prototypeMethods.initialize
        sinon.stub(bookshelf.Model.prototype, 'on')
        onStub = bookshelf.Model.prototype.on
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

    describe('#validateCreate', () => {
      let githubId = 123456
      let attrs

      beforeEach(() => {
        attrs = { github_id: githubId }
        sinon.stub(GithubAPI, 'getUser').resolves(githubUserFixture)
      })

      afterEach(() => {
        GithubAPI.getUser.restore()
      })

      it('should check if the github id exists and is for a user', done => {
        user.validateCreate({}, attrs)
          .asCallback(err => {
            expect(err).to.not.exist
            sinon.assert.calledOnce(GithubAPI.getUser)
            sinon.assert.calledWithExactly(GithubAPI.getUser, githubId)
            done()
          })
      })

      it('should throw an error if the user does not exist', done => {
        let githubErr = new GithubEntityNotFoundError(new Error())
        GithubAPI.getUser.rejects(githubErr)

        let attrs = { github_id: githubId }
        user.validateCreate({}, attrs)
          .asCallback(err => {
            expect(err).to.exist
            expect(err).to.equal(githubErr)
            sinon.assert.calledOnce(GithubAPI.getUser)
            sinon.assert.calledWithExactly(GithubAPI.getUser, githubId)
            done()
          })
      })
    })

    describe('#getAllUserOrgsIds', () => {
      let fetchStub
      let models
      let orgId1 = 1
      let orgId2 = 6

      beforeEach(() => {
        models = {
          toJSON: sinon.stub().returns({
            organizations: [{ id: orgId1 }, { id: orgId2 }]
          })
        }
        sinon.stub(User.prototype, 'fetch').resolves(models)
        fetchStub = User.prototype.fetch
      })

      afterEach(() => {
        User.prototype.fetch.restore()
        fetchStub = null
      })

      it('should fetch the models', done => {
        user.getAllUserOrgsIds()
          .asCallback(err => {
            expect(err).to.not.exist
            sinon.assert.calledOnce(fetchStub)
            sinon.assert.calledWithExactly(fetchStub, sinon.match.object)
            done()
          })
      })

      it('should not allow you to ovewrite the `withRelated` property', done => {
        let opts = { withRelated: ['not-organizations'], hello: 'world' }
        user.getAllUserOrgsIds(opts)
          .asCallback(err => {
            expect(err).to.not.exist
            sinon.assert.calledOnce(fetchStub)
            sinon.assert.calledWithExactly(fetchStub, {
              hello: 'world',
              withRelated: ['organizations']
            })
            done()
          })
      })

      it('should map over the entries and return their ids', done => {
        user.getAllUserOrgsIds()
          .asCallback((err, res) => {
            expect(err).to.not.exist
            sinon.assert.calledOnce(fetchStub)
            expect(res).to.deep.equal([orgId1, orgId2])
            done()
          })
      })

      it('should throw an error if fetch fails', done => {
        let err = new Error()
        fetchStub.rejects(err)

        user.getAllUserOrgsIds()
          .asCallback(err => {
            expect(err).to.exist
            expect(err).to.equal(err)
            done()
          })
      })
    })
  })
})
