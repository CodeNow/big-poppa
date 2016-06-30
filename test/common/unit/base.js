'use strict'

const Promise = require('bluebird')
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const expect = require('chai').expect

const bookshelf = require('common/models').bookshelf
const BaseModel = require('common/models/base')
const User = require('common/models/user')

const NotNullError = require('common/errors/not-null-error')
const NoRowsDeletedError = require('common/errors/no-rows-deleted-error')

describe('Base', () => {
  describe('Prototype Methods', () => {
    describe('#initialize', () => {
      let model
      let initialize = sinon.spy(BaseModel.prototypeMethods.initialize)

      beforeEach(() => {
        model = {
          on: sinon.stub(),
          logSaving: sinon.stub(),
          logSaved: sinon.stub(),
          logDestroying: sinon.stub(),
          logDestroyed: sinon.stub()
        }
      })

      it('should add all listeners', () => {
        initialize.apply(model)
        sinon.assert.called(model.on)
        expect(model.on.callCount).to.equal(4)
        let firstCallargs = model.on.firstCall.args
        expect(firstCallargs[0]).to.equal('saving')
        expect(firstCallargs[1]).to.equal(model.logSaving)
        let seconCallargs = model.on.secondCall.args
        expect(seconCallargs[0]).to.equal('saved')
        expect(seconCallargs[1]).to.equal(model.logSaved)
        let thirdCallargs = model.on.thirdCall.args
        expect(thirdCallargs[0]).to.equal('destroying')
        expect(thirdCallargs[1]).to.equal(model.logDestroying)
      })

      it('should create a logger', () => {
        initialize.apply(model)
        sinon.assert.called(model.on)
        expect(model.log).to.be.an('object')
      })
    })
    describe('#save', () => {
      beforeEach(() => {
        sinon.stub(bookshelf.Model.prototype, 'save').resolves()
      })

      afterEach(() => {
        bookshelf.Model.prototype.save.restore()
      })

      describe('Errors', () => {
        it('should correctly cast a NotNullError', (done) => {
          let error = new Error()
          error.code = '23502'
          bookshelf.Model.prototype.save.rejects(error)

          let githubId = 1
          let user = new User({ github_id: githubId })
          expect(user.save).to.equal(BaseModel.prototypeMethods.save)
          user.save().asCallback(err => {
            sinon.assert.calledOnce(bookshelf.Model.prototype.save)
            expect(err).to.be.an.instanceOf(NotNullError)
            done()
          })
        })
      })

      describe('Success', () => {
        it('should save the model if no errors are thrown', (done) => {
          let githubId = 1
          let user = new User({ github_id: githubId })
          expect(user.save).to.equal(BaseModel.prototypeMethods.save)
          user.save().asCallback(err => {
            expect(err).to.not.exist
            sinon.assert.calledOnce(bookshelf.Model.prototype.save)
            let model = bookshelf.Model.prototype.save.thisValues[0]
            expect(model.get('github_id')).to.equal(githubId)
          })
          .asCallback(done)
        })
      })
    })

    describe('#destroy', () => {
      beforeEach(() => {
        sinon.stub(bookshelf.Model.prototype, 'destroy').resolves()
      })

      afterEach(() => {
        bookshelf.Model.prototype.destroy.restore()
      })

      describe('Errors', () => {
        it('should correctly cast a NotNullError', (done) => {
          let error = new Error('super error')
          error.code = '23502'
          bookshelf.Model.prototype.destroy.rejects(error)

          let githubId = 1
          let user = new User({ github_id: githubId })
          expect(user.destroy).to.equal(BaseModel.prototypeMethods.destroy)
          user.destroy().asCallback(err => {
            sinon.assert.calledOnce(bookshelf.Model.prototype.destroy)
            expect(err).to.be.an.instanceOf(NotNullError)
            done()
          })
        })

        it('should correctly cast a NoRowsDeletedError', (done) => {
          // http://bookshelfjs.org/#section-Model-static-NoRowsDeletedError
          let error = new User.NoRowsDeletedError('super error')
          bookshelf.Model.prototype.destroy.rejects(error)

          let githubId = 1
          let user = new User({ github_id: githubId })
          expect(user.destroy).to.equal(BaseModel.prototypeMethods.destroy)
          user.destroy().asCallback(err => {
            sinon.assert.calledOnce(bookshelf.Model.prototype.destroy)
            expect(err).to.be.an.instanceOf(NoRowsDeletedError)
            done()
          })
        })
      })

      describe('Success', () => {
        it('should destroy the model if no errors are thrown', (done) => {
          let githubId = 1
          let user = new User({ github_id: githubId })
          expect(user.destroy).to.equal(BaseModel.prototypeMethods.destroy)
          user.destroy().asCallback(err => {
            expect(err).to.not.exist
            sinon.assert.calledOnce(bookshelf.Model.prototype.destroy)
            let model = bookshelf.Model.prototype.destroy.thisValues[0]
            expect(model.get('github_id')).to.equal(githubId)
          })
          .asCallback(done)
        })
      })
    })

    describe('#getAllUserOrgsIds', () => {

    })
  })

  describe('Static Methods', () => {
    describe('#fetchById', () => {
    })

    describe('#fetchById', () => {
    })
  })
})
