'use strict'

const Promise = require('bluebird')
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const expect = require('chai').expect

const bookshelf = require('models').bookshelf
const BaseModel = require('models/base')

const DatabaseError = require('errors/database-error')
const ForeignKeyError = require('errors/foreign-key-error')
const NotNullError = require('errors/not-null-error')
const NotFoundError = require('errors/not-found-error')
const NoRowsUpdatedError = require('errors/no-rows-updated-error')
const NoRowsDeletedError = require('errors/no-rows-deleted-error')
const UniqueError = require('errors/unique-error')

describe('Base', () => {
  let TestModel

  before(() => {
    // Create a test model to ensure nothing gets overwritten
    TestModel = BaseModel.extend('TestModel')
  })

  describe('#extend', () => {
    let StubModel
    let stubInstance

    before(() => {
      StubModel = BaseModel.extend('StubModel')
      stubInstance = new StubModel()
    })

    it('should set the `modelName` on prototype and static methods', () => {
      expect(StubModel.modelName).to.equal('StubModel')
      expect(stubInstance.modelName).to.equal('StubModel')
    })

    it('should create an empty model if no prototype/static methods are passed', () => {
      expect(StubModel.fetchById).to.be.a('function')
      expect(StubModel.fetchById).to.equal(BaseModel.staticMethods.fetchById)
      expect(stubInstance.save).to.be.a('function')
      expect(stubInstance.save).to.equal(BaseModel.prototypeMethods.save)
    })

    it('should overwrite base behavior', () => {
      let save = () => {}
      let fetchById = () => {}
      StubModel = BaseModel.extend('StubModel2', { save: save }, { fetchById: fetchById })
      stubInstance = new StubModel()

      expect(StubModel.fetchById).to.be.a('function')
      expect(StubModel.fetchById).to.equal(fetchById)
      expect(stubInstance.save).to.be.a('function')
      expect(stubInstance.save).to.equal(save)
    })
  })

  describe('Prototype Methods', () => {
    describe('#initialize', () => {
      let model
      let initialize

      beforeEach(() => {
        initialize = sinon.spy(BaseModel.prototypeMethods, 'initialize')
        model = {
          on: sinon.stub(),
          logSaving: sinon.stub(),
          logSaved: sinon.stub(),
          logDestroying: sinon.stub(),
          logDestroyed: sinon.stub()
        }
      })

      afterEach(() => {
        BaseModel.prototypeMethods.initialize.restore()
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

    describe('#parse', () => {
      let testModel

      beforeEach(() => {
        testModel = new TestModel({})
      })

      it('should return a different object', () => {
        let obj = {}
        let res = testModel.parse(obj)
        expect(res).to.be.an.object
        expect(res).to.not.equal(obj)
      })

      it('should convert snake_case into camelCase', () => {
        let value = 'hello'
        let res = testModel.parse({ hello_world: value })
        expect(res).to.have.property('helloWorld', value)
      })
    })

    describe('#format', () => {
      let testModel

      beforeEach(() => {
        testModel = new TestModel({})
      })

      it('should return a different object', () => {
        let obj = {}
        let res = testModel.format(obj)
        expect(res).to.be.an.object
        expect(res).to.not.equal(obj)
      })

      it('should convert camelCase into snake_case', () => {
        let value = 'hello'
        let res = testModel.format({ helloWorld: value })
        expect(res).to.have.property('hello_world', value)
      })
    })

    describe('#save', () => {
      let saveStub

      beforeEach(() => {
        saveStub = sinon.stub(bookshelf.Model.prototype, 'save').resolves()
      })

      afterEach(() => {
        bookshelf.Model.prototype.save.restore()
      })

      describe('Errors', () => {
        it('should correctly cast a NotNullError', (done) => {
          let error = new Error()
          error.code = '23502'
          saveStub.rejects(error)

          let githubId = 1
          let testModel = new TestModel({ githubId: githubId })
          testModel.save().asCallback(err => {
            sinon.assert.calledOnce(saveStub)
            expect(err).to.be.an.instanceOf(NotNullError)
            done()
          })
        })
      })

      describe('Success', () => {
        it('should save the model if no errors are thrown', (done) => {
          let githubId = 1
          let testModel = new TestModel({ githubId: githubId })
          testModel.save()
            .then(() => {
              sinon.assert.calledOnce(saveStub)
              let model = saveStub.thisValues[0]
              expect(model.get('githubId')).to.equal(githubId)
            })
            .asCallback(done)
        })
      })
    })

    describe('#destroy', () => {
      let destroyStub

      beforeEach(() => {
        destroyStub = sinon.stub(bookshelf.Model.prototype, 'destroy').resolves()
      })

      afterEach(() => {
        bookshelf.Model.prototype.destroy.restore()
      })

      describe('Errors', () => {
        it('should correctly cast a NotNullError', (done) => {
          let error = new Error('super error')
          error.code = '23502'
          destroyStub.rejects(error)

          let githubId = 1
          let testModel = new TestModel({ githubId: githubId })
          testModel.destroy().asCallback(err => {
            sinon.assert.calledOnce(destroyStub)
            expect(err).to.be.an.instanceOf(NotNullError)
            done()
          })
        })

        it('should correctly cast a NoRowsDeletedError', (done) => {
          // http://bookshelfjs.org/#section-Model-static-NoRowsDeletedError
          let error = new TestModel.NoRowsDeletedError('super error')
          destroyStub.rejects(error)

          let githubId = 1
          let testModel = new TestModel({ githubId: githubId })
          testModel.destroy().asCallback(err => {
            sinon.assert.calledOnce(destroyStub)
            expect(err).to.be.an.instanceOf(NoRowsDeletedError)
            done()
          })
        })
      })

      describe('Success', () => {
        it('should destroy the model if no errors are thrown', (done) => {
          let githubId = 1
          let testModel = new TestModel({ githubId: githubId })
          testModel.destroy()
            .then(() => {
              sinon.assert.calledOnce(destroyStub)
              let model = destroyStub.thisValues[0]
              expect(model.get('githubId')).to.equal(githubId)
            })
            .asCallback(done)
        })
      })
    })

    describe('Loggers', () => {
      let model
      let attrs
      let opts
      let modelName
      let queryString
      beforeEach(() => {
        modelName = 'WOW'
        queryString = 'select * from "testModel"'
        model = {
          modelName: modelName,
          log: {
            info: sinon.stub()
          }
        }
        attrs = {}
        opts = {
          method: 'insert',
          query: {
            toString: sinon.stub().returns(queryString)
          }
        }
      })

      describe('#logSaving', () => {
        it('should call the logger', () => {
          BaseModel.prototypeMethods.logSaving(model, attrs, opts)
          sinon.assert.calledOnce(model.log.info)
          sinon.assert.calledWithExactly(
            model.log.info,
            {
              attrs: attrs,
              method: opts.method,
              query: queryString
            },
            'Saving ' + modelName
          )
          sinon.assert.calledOnce(opts.query.toString)
        })
      })

      describe('#logSaved', () => {
        it('should call the logger', () => {
          BaseModel.prototypeMethods.logSaved(model, attrs, opts)
          sinon.assert.calledOnce(model.log.info)
          sinon.assert.calledWithExactly(
            model.log.info,
            {
              attrs: attrs,
              method: opts.method,
              query: queryString
            },
            'Saved ' + modelName
          )
          sinon.assert.calledOnce(opts.query.toString)
        })
      })

      describe('#logDestroying', () => {
        it('should call the logger', () => {
          BaseModel.prototypeMethods.logDestroying(model, opts)
          sinon.assert.calledOnce(model.log.info)
          sinon.assert.calledWithExactly(
            model.log.info,
            {
              method: opts.method,
              query: queryString
            },
            'Destroying ' + modelName
          )
          sinon.assert.calledOnce(opts.query.toString)
        })
      })

      describe('#logDestroyed', () => {
        it('should call the logger', () => {
          BaseModel.prototypeMethods.logDestroyed(model, attrs, opts)
          sinon.assert.calledOnce(model.log.info)
          sinon.assert.calledWithExactly(
            model.log.info,
            {
              method: opts.method,
              query: queryString
            },
            'Destroyed ' + modelName
          )
          sinon.assert.calledOnce(opts.query.toString)
        })
      })
    })

    describe('#getAllIdsForRelated', () => {
      let fetchStub
      let models
      let orgId1 = 1
      let orgId2 = 6
      let testModel

      beforeEach(() => {
        models = {
          toJSON: sinon.stub().returns({
            organizations: [{ id: orgId1 }, { id: orgId2 }]
          })
        }
        fetchStub = sinon.stub(TestModel.prototype, 'fetch').resolves(models)
        testModel = new TestModel()
      })

      afterEach(() => {
        TestModel.prototype.fetch.restore()
      })

      it('should fetch the models', done => {
        testModel.getAllIdsForRelated('organizations')
          .then(() => {
            sinon.assert.calledOnce(fetchStub)
            sinon.assert.calledWithExactly(fetchStub, sinon.match.object)
          })
          .asCallback(done)
      })

      it('should not allow you to ovewrite the `withRelated` property', done => {
        let opts = { withRelated: ['not-organizations'], hello: 'world' }
        testModel.getAllIdsForRelated('organizations', opts)
          .then(() => {
            sinon.assert.calledOnce(fetchStub)
            sinon.assert.calledWithExactly(fetchStub, {
              hello: 'world',
              withRelated: ['organizations']
            })
          })
          .asCallback(done)
      })

      it('should map over the entries and return their ids', done => {
        testModel.getAllIdsForRelated('organizations')
          .then(res => {
            sinon.assert.calledOnce(fetchStub)
            expect(res).to.deep.equal([orgId1, orgId2])
          })
          .asCallback(done)
      })

      it('should throw an error if fetch fails', done => {
        let err = new Error()
        fetchStub.rejects(err)

        testModel.getAllIdsForRelated('organizations')
          .asCallback(err => {
            expect(err).to.exist
            expect(err).to.equal(err)
            done()
          })
      })
    })
  })

  describe('Static Methods', () => {
    describe('#fetchById', () => {
      let modelId = 123
      let testModel = {}
      let fetchStub

      beforeEach(() => {
        fetchStub = sinon.stub(bookshelf.Model.prototype, 'fetch').resolves(testModel)
      })

      afterEach(() => {
        bookshelf.Model.prototype.fetch.restore()
      })

      it('should return the model', done => {
        TestModel.fetchById(modelId)
          .then(res => {
            expect(res).to.equal(testModel)
          })
          .asCallback(done)
      })

      it('should fetch the model with `require`', done => {
        TestModel.fetchById(modelId)
          .then(() => {
            sinon.assert.calledOnce(fetchStub)
            expect(fetchStub.thisValues[0].get('id')).to.equal(modelId)
            sinon.assert.calledWithExactly(fetchStub, { require: true })
          })
          .asCallback(done)
      })

      it('should pass opts (like a transaction) into fetch', done => {
        let t = {} // transaction
        TestModel.fetchById(modelId, { transacting: t })
          .then(() => {
            sinon.assert.calledOnce(fetchStub)
            expect(fetchStub.thisValues[0].get('id')).to.equal(modelId)
            sinon.assert.calledWithExactly(fetchStub, { require: true, transacting: t })
          })
          .asCallback(done)
      })

      it('should should not override the `require` opt', done => {
        TestModel.fetchById(modelId, { require: false })
          .then(() => {
            sinon.assert.calledOnce(fetchStub)
            expect(fetchStub.thisValues[0].get('id')).to.equal(modelId)
            sinon.assert.calledWithExactly(fetchStub, { require: true })
          })
          .asCallback(done)
      })

      it('should throw a database error if `fetch` throws an error', done => {
        let err = new Error()
        fetchStub.rejects(err)

        TestModel.fetchById(modelId)
          .asCallback(err => {
            expect(err).to.exist
            sinon.assert.calledOnce(fetchStub)
            expect(fetchStub.thisValues[0].get('id')).to.equal(modelId)
            sinon.assert.calledWithExactly(fetchStub, { require: true })
            done()
          })
      })
    })

    describe('#fetchByGithubId', () => {
      let githubId = 123
      let testModel = {}
      let fetchStub
      let queryStub

      beforeEach(() => {
        fetchStub = sinon.stub(bookshelf.Model.prototype, 'fetch').resolves(testModel)
        queryStub = sinon.stub(bookshelf.Model.prototype, 'query').returnsThis()
      })

      afterEach(() => {
        fetchStub.restore()
        queryStub.restore()
      })

      it('should return the model', done => {
        TestModel.fetchByGithubId(githubId)
          .then(res => {
            expect(res).to.equal(testModel)
          })
          .asCallback(done)
      })

      it('should fetch the model with `require`', done => {
        TestModel.fetchByGithubId(githubId)
          .then(() => {
            sinon.assert.calledOnce(fetchStub)
            expect(fetchStub.thisValues[0].get('githubId')).to.equal(githubId)
            sinon.assert.calledWithExactly(fetchStub, { require: true })
          })
          .asCallback(done)
      })

      it('should pass opts (like a transaction) into fetch', done => {
        let t = {} // transaction
        TestModel.fetchByGithubId(githubId, { transacting: t })
          .then(() => {
            sinon.assert.calledOnce(fetchStub)
            expect(fetchStub.thisValues[0].get('githubId')).to.equal(githubId)
            sinon.assert.calledWithExactly(fetchStub, { require: true, transacting: t })
          })
          .asCallback(done)
      })

      it('should not call `query(onUpdate)` by default', done => {
        return TestModel.fetchByGithubId(githubId)
          .then(() => {
            sinon.assert.notCalled(queryStub)
          })
          .asCallback(done)
      })

      it('should call `query(onUpdate)` if passed the `forUpdate` query', done => {
        return TestModel.fetchByGithubId(githubId, { forUpdate: true })
          .then(() => {
            sinon.assert.calledOnce(queryStub)
            sinon.assert.calledWithExactly(queryStub, 'forUpdate')
          })
          .asCallback(done)
      })

      it('should should not override the `require` opt', done => {
        TestModel.fetchByGithubId(githubId, { require: false })
          .then(() => {
            sinon.assert.calledOnce(fetchStub)
            expect(fetchStub.thisValues[0].get('githubId')).to.equal(githubId)
            sinon.assert.calledWithExactly(fetchStub, { require: true })
          })
          .asCallback(done)
      })

      it('should throw a database error if `fetch` throws an error', done => {
        let err = new Error()
        fetchStub.rejects(err)

        TestModel.fetchByGithubId(githubId)
          .asCallback(err => {
            expect(err).to.exist
            expect(err).to.be.an.instanceOf(Error)
            sinon.assert.calledOnce(fetchStub)
            expect(fetchStub.thisValues[0].get('githubId')).to.equal(githubId)
            sinon.assert.calledWithExactly(fetchStub, { require: true })
            done()
          })
      })
    })

    describe('#castDatabaseError', () => {
      it('should cast a `Model.NotFoundError` as a `NotFoundError`', done => {
        let thrownError = new TestModel.NotFoundError()
        Promise.method(TestModel.castDatabaseError.bind(TestModel))(thrownError)
          .asCallback(err => {
            expect(err).to.exist
            expect(err).to.be.an.instanceOf(NotFoundError)
            expect(err.message).to.match(/testmodel/i)
            expect(err.data.err).to.equal(thrownError)
            done()
          })
      })

      it('should cast a `Model.NoRowsUpdatedError` as a `NoRowsUpdatedError`', done => {
        let thrownError = new TestModel.NoRowsUpdatedError()
        Promise.method(TestModel.castDatabaseError.bind(TestModel))(thrownError)
          .asCallback(err => {
            expect(err).to.exist
            expect(err).to.be.an.instanceOf(NoRowsUpdatedError)
            expect(err.message).to.match(/testmodel/i)
            expect(err.data.err).to.equal(thrownError)
            done()
          })
      })

      it('should cast a `Model.NoRowsDeletedError` as a `NoRowsDeletedError`', done => {
        let thrownError = new TestModel.NoRowsDeletedError()
        Promise.method(TestModel.castDatabaseError.bind(TestModel))(thrownError)
          .asCallback(err => {
            expect(err).to.exist
            expect(err).to.be.an.instanceOf(NoRowsDeletedError)
            expect(err.message).to.match(/testmodel/i)
            expect(err.data.err).to.equal(thrownError)
            done()
          })
      })

      it('should cast an error with code `23502` as a `NotNullError` error', done => {
        let thrownError = new Error('yo')
        thrownError.code = '23502'
        Promise.method(TestModel.castDatabaseError.bind(TestModel))(thrownError)
          .asCallback(err => {
            expect(err).to.exist
            expect(err).to.be.an.instanceOf(NotNullError)
            expect(err.data.err).to.equal(thrownError)
            done()
          })
      })

      it('should cast an error with code `23503` as a `ForeignKeyError` error', done => {
        let thrownError = new Error('yo')
        thrownError.code = '23503'
        Promise.method(TestModel.castDatabaseError.bind(TestModel))(thrownError)
          .asCallback(err => {
            expect(err).to.exist
            expect(err).to.be.an.instanceOf(ForeignKeyError)
            expect(err.data.err).to.equal(thrownError)
            done()
          })
      })

      it('should cast an error with code `23505` as a `UniqueError` error', done => {
        let thrownError = new Error('yo')
        thrownError.code = '23505'
        Promise.method(TestModel.castDatabaseError.bind(TestModel))(thrownError)
          .asCallback(err => {
            expect(err).to.exist
            expect(err).to.be.an.instanceOf(UniqueError)
            expect(err.data.err).to.equal(thrownError)
            done()
          })
      })

      it('should cast any other error with a code as a database error', done => {
        let thrownError = new Error('yo')
        thrownError.code = '12345'
        Promise.method(TestModel.castDatabaseError.bind(TestModel))(thrownError)
          .asCallback(err => {
            expect(err).to.exist
            expect(err).to.be.an.instanceOf(DatabaseError)
            expect(err.data.err).to.equal(thrownError)
            done()
          })
      })

      it('should rethrow any other error', done => {
        let thrownError = new Error('yo')
        Promise.method(TestModel.castDatabaseError.bind(TestModel))(thrownError)
          .asCallback(err => {
            expect(err).to.exist
            expect(err).to.be.an.instanceOf(Error)
            expect(err).to.equal(thrownError)
            done()
          })
      })
    })
  })
})
