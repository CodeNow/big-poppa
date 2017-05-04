'use strict'

const Promise = require('bluebird')
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const expect = require('chai').expect

const bookshelf = require('models').bookshelf
const BaseModel = require('models/base')
const DockerRegistry = require('util/docker-registry')
const moment = require('moment')
const Organization = require('models/organization')
const User = require('models/user')
const rabbitMQ = require('util/rabbitmq')

const GithubAPI = require('util/github')
const GithubEntityNotFoundError = require('errors/github-entity-not-found-error')
const GithubEntityTypeError = require('errors/github-entity-type-error')
const githubOrganizationFixture = require('../../fixtures/github/organization')
const githubUserFixture = require('../../fixtures/github/user')

const ValidationError = require('errors/validation-error')

describe('Organization', () => {
  describe('Prototype Methods', () => {
    let org
    let baseModel
    let setStub
    const orgGithubId = githubOrganizationFixture.id
    const userGithubId = githubUserFixture.id

    beforeEach(() => {
      setStub = sinon.stub()
      org = new Organization({ githubId: orgGithubId })
      baseModel = {
        set: setStub
      }
    })
    afterEach(() => {
      setStub.reset()
      process.env.ON_PREM = 'false'
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
      let getUserStub
      let attrs
      const orgName = githubOrganizationFixture.login
      const userName = githubUserFixture.login

      beforeEach(() => {
        belongsToManyStub = sinon.stub(Organization.prototype, 'belongsToMany')
        attrs = { githubId: githubId }
        getOrganizationStub = sinon.stub(GithubAPI.prototype, 'getOrganization').resolves(githubOrganizationFixture)
        getUserStub = sinon.stub(GithubAPI.prototype, 'getUser').resolves(githubUserFixture)
      })

      afterEach(() => {
        belongsToManyStub.restore()
        getOrganizationStub.restore()
        getUserStub.restore()
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
        org.validateCreate(baseModel, attrs)
        .then(() => {
          sinon.assert.calledOnce(GithubAPI.prototype.getOrganization)
        })
        .asCallback(done)
      })

      it('should check if the github id is for a user/personal account if github user is not an org', done => {
        const thrownErrr = new GithubEntityTypeError()
        getOrganizationStub.rejects(thrownErrr)

        org.validateCreate(baseModel, attrs)
        .then(() => {
          sinon.assert.calledOnce(getUserStub)
        })
        .asCallback(done)
      })

      it('should set the organiztion with a name', done => {
        org.validateCreate(baseModel, attrs)
        .then(() => {
          sinon.assert.calledOnce(setStub)
          sinon.assert.calledWith(
            setStub,
            { name: orgName }
          )
        })
        .asCallback(done)
      })

      it('should set the organiztion with name and `isPersonalAccount` if its a user account', done => {
        const thrownErrr = new GithubEntityTypeError()
        getOrganizationStub.rejects(thrownErrr)

        org.validateCreate(baseModel, attrs)
        .then(() => {
          sinon.assert.calledOnce(setStub)
          sinon.assert.calledWith(
            setStub,
            { name: userName, isPersonalAccount: true, prBotEnabled: true, firstDockCreated: true }
          )
        })
        .asCallback(done)
      })

      it('should throw an error if the org does not exist', done => {
        let githubErr = new GithubEntityNotFoundError(new Error())
        GithubAPI.prototype.getOrganization.rejects(githubErr)
        let attrs = { githubId: githubId }
        org.validateCreate(baseModel, attrs)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.equal(githubErr)
          sinon.assert.calledOnce(GithubAPI.prototype.getOrganization)
          sinon.assert.calledWithExactly(GithubAPI.prototype.getOrganization, githubId)
          done()
        })
      })
    })

    describe('#addUser', () => {
      let user
      let usersStub
      let attachStub
      let collectionStub
      let publishEventStub
      let hasUserOrgMembershipStub

      beforeEach(() => {
        attachStub = sinon.stub().resolves()
        collectionStub = {
          attach: attachStub
        }
        usersStub = sinon.stub(Organization.prototype, 'users').returns(collectionStub)
        hasUserOrgMembershipStub = sinon.stub(GithubAPI.prototype, 'hasUserOrgMembership').resolves({})
        publishEventStub = sinon.stub(rabbitMQ, 'publishEvent')
        user = new User({ id: Math.floor(Math.random() * 100), githubId: userGithubId })
      })

      afterEach(() => {
        Organization.prototype.users.restore()
        GithubAPI.prototype.hasUserOrgMembership.restore()
        publishEventStub.restore()
        hasUserOrgMembershipStub.restore()
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

      it('should throw a `ValidationError` if the org is a personal account and the user is not the owner', done => {
        org.set({ isPersonalAccount: true })

        org.addUser(user)
          .asCallback(err => {
            expect(err).to.exist
            expect(err).to.be.an.instanceOf(ValidationError)
            expect(err.message).to.match(/only.*github.*user.*allowed/i)
            done()
          })
      })

      it('should add the user if the org is a personal account and the user is the owner', done => {
        let userId = user.get('id')
        org.set({ githubId: userGithubId, isPersonalAccount: true })

        org.addUser(user)
          .then(() => {
            sinon.assert.calledOnce(usersStub)
            expect(usersStub.thisValues[0]).to.equal(org)
            sinon.assert.calledOnce(attachStub)
            sinon.assert.calledWithExactly(attachStub, userId, undefined)
            sinon.assert.notCalled(hasUserOrgMembershipStub)
          })
          .asCallback(done)
      })

      it('should `attach` the user using its id', done => {
        let userId = user.get('id')

        org.addUser(user)
          .then(() => {
            sinon.assert.calledOnce(usersStub)
            expect(usersStub.thisValues[0]).to.equal(org)
            sinon.assert.calledOnce(attachStub)
            sinon.assert.calledWithExactly(attachStub, userId, undefined)
            sinon.assert.calledOnce(hasUserOrgMembershipStub)
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

      it('should publish an event with rabbitMQ', () => {
        org.addUser(user)
          .then(() => {
            sinon.assert.calledOnce(publishEventStub)
            sinon.assert.calledWithExactly(
              publishEventStub,
              'organization.user.added',
              {
                user: {
                  id: user.id,
                  githubId: user.get('githubId')
                },
                organization: {
                  id: org.id,
                  githubId: org.get('githubId')
                }
              }
            )
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
      let user
      const userId = Math.floor(Math.random() * 100)

      beforeEach(() => {
        saveStub = sinon.stub(bookshelf.Model.prototype, 'save').resolves()
        user = new User({ id: userId })
      })

      afterEach(() => {
        bookshelf.Model.prototype.save.restore()
      })

      it('should save the new organization', done => {
        Organization.create(githubId, user)
          .then(() => {
            sinon.assert.calledOnce(saveStub)
          })
          .asCallback(done)
      })

      it('should save the new organization with the github id', done => {
        Organization.create(githubId, user)
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

      it('should save the creator', done => {
        Organization.create(githubId, user)
          .then(() => {
            sinon.assert.calledOnce(saveStub)
            sinon.assert.calledWithExactly(
              saveStub,
              sinon.match.has('creator', userId),
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
        let beforeThirtyDaysFromToday = moment(beforeTime).add(30, 'days').utc().toDate()
        Organization.create(githubId, user)
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
            let afterThirtyDaysFromToday = moment(afterTime).add(30, 'days').utc().toDate()

            let compareTime = createCompareTime(beforeTime, afterTime)
            let thirtyCompareTime = createCompareTime(beforeThirtyDaysFromToday, afterThirtyDaysFromToday)
            let timeMatch = sinon.match(compareTime)
            sinon.assert.calledWithExactly(
              saveStub,
              sinon.match.has('trialEnd', sinon.match(thirtyCompareTime))
                .and(sinon.match.has('activePeriodEnd', timeMatch)),
              undefined
            )
          })
          .asCallback(done)
      })

      it('should call `save` with the passed options', done => {
        let opts = { transacting: {} }
        Organization.create(githubId, user, opts)
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

      it('should set first dock created true if on_prem', done => {
        process.env.ON_PREM = 'true'
        let oneYearFromNow = moment().add(1, 'year').utc()
        Organization.create(githubId, user)
          .then(() => {
            sinon.assert.calledOnce(saveStub)
            expect(oneYearFromNow.isSame(saveStub.args[0][0].activePeriodEnd, 'minutes')).to.equal(true)
            sinon.assert.calledWithExactly(
              saveStub,
              sinon.match.has('firstDockCreated', true),
              undefined
            )
          })
          .asCallback(done)
      })
    })
    describe('#processDockerRegistryCredentials', () => {
      let validateCredentialsStub
      let rabbitStub
      let org
      const orgId = Math.floor(Math.random() * 100)
      const password = 'asdasdasdasdasd'
      let opts

      beforeEach(() => {
        validateCredentialsStub = sinon.stub(DockerRegistry, 'validateCredentials').resolves()
        rabbitStub = sinon.stub(rabbitMQ, 'publishOrgRegistryPasswordSubmitted').resolves()
        opts = {
          privateRegistryUrl: 'asdasdasd',
          privateRegistryUsername: 'sadfsdfsdfdsf',
          privateRegistryPassword: password
        }
      })

      afterEach(() => {
        validateCredentialsStub.restore()
        rabbitStub.restore()
      })

      it('should call validateCredentials with the right stuff', done => {
        Organization.processDockerRegistryCredentials(orgId, opts)
          .then(() => {
            sinon.assert.calledOnce(validateCredentialsStub)
            sinon.assert.calledWithExactly(
              validateCredentialsStub,
              opts.privateRegistryUrl,
              opts.privateRegistryUsername,
              password
            )
          })
          .asCallback(done)
      })

      it('should call publishEvent with the right stuff', done => {
        Organization.processDockerRegistryCredentials(orgId, opts)
          .then(() => {
            sinon.assert.calledOnce(validateCredentialsStub)
            sinon.assert.calledWithExactly(
              rabbitStub,
              orgId,
              password
            )
          })
          .asCallback(done)
      })

      it('should delete the password from the optsr', done => {
        Organization.processDockerRegistryCredentials(org, opts)
          .then(() => {
            expect(opts.privateRegistryPassword).to.not.exist
          })
          .asCallback(done)
      })

      describe('Skip on missing fields', () => {
        it('should skip everything if privateRegistryUrl is missing', done => {
          delete opts.privateRegistryUrl
          Organization.processDockerRegistryCredentials(org, opts)
            .then(() => {
              sinon.assert.notCalled(validateCredentialsStub)
            })
            .asCallback(done)
        })
        it('should skip everything if privateRegistryUsername is missing', done => {
          delete opts.privateRegistryUsername
          Organization.processDockerRegistryCredentials(org, opts)
            .then(() => {
              sinon.assert.notCalled(validateCredentialsStub)
            })
            .asCallback(done)
        })
        it('should skip everything if privateRegistryPassword is missing', done => {
          delete opts.privateRegistryPassword
          Organization.processDockerRegistryCredentials(org, opts)
            .then(() => {
              sinon.assert.notCalled(validateCredentialsStub)
            })
            .asCallback(done)
        })
      })
    })
  })
})
