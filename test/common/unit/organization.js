'use strict'

const Promise = require('bluebird')
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const expect = require('chai').expect

const bookshelf = require('common/models').bookshelf
const BaseModel = require('common/models/base')
const Organization = require('common/models/organization')

const GithubAPI = require('common/github')
const GithubEntityNotFoundError = require('common/errors/github-entity-not-found-error')
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
          .asCallback(err => {
            expect(err).to.not.exist
            sinon.assert.calledOnce(GithubAPI.getOrganization)
            sinon.assert.calledWithExactly(GithubAPI.getOrganization, githubId)
            done()
          })
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
    })

    describe('#removeUser', () => {
    })

    describe('#getAllUserIds', () => {
    })
  })

  describe('Static Methods', () => {
    describe('#create', () => {
    })
  })
})
