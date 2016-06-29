'use strict'

const Promise = require('bluebird')
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const expect = require('chai').expect

const bookshelf = require('common/models').bookshelf
const User = require('common/models/user')

const NotNullError = require('common/errors/not-null-error')
const NoRowsDeletedError = require('common/errors/no-rows-deleted-error')

describe('User', () => {
  describe('Prototype Methods', () => {
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
          new User({ github_id: githubId }).save().asCallback(err => {
            sinon.assert.calledOnce(bookshelf.Model.prototype.save)
            expect(err).to.be.an.instanceOf(NotNullError)
            done()
          })
        })
      })

      describe('Success', () => {
        it('should save the model if no errors are thrown', (done) => {
          let githubId = 1
          new User({ github_id: githubId }).save().then(() => {
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
          new User({ github_id: githubId }).destroy().asCallback(err => {
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
          new User({ github_id: githubId }).destroy().asCallback(err => {
            sinon.assert.calledOnce(bookshelf.Model.prototype.destroy)
            expect(err).to.be.an.instanceOf(NoRowsDeletedError)
            done()
          })
        })
      })

      describe('Success', () => {
        it('should destroy the model if no errors are thrown', (done) => {
          let githubId = 1
          new User({ github_id: githubId }).destroy().then(() => {
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
