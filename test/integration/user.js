'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect
const superagentPromisePlugin = require('superagent-promise-plugin')
const request = superagentPromisePlugin.patch(require('superagent'))

const testUtil = require('../util')
const githubUserFixture = require('../fixtures/github/user')
const MockAPI = require('mehpi')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)
const rabbitMQ = require('util/rabbitmq')

const workerServer = require('workers/server')
const httpServer = require('http/server')

describe('User Integration Test', () => {
  let userGithubId = 1981198
  let publisher

  // Start HTTP Server
  before(() => httpServer.start())
  after(() => httpServer.stop())

  // RabbitMQ
  before('Connect to RabbitMQ', () => {
    return testUtil.connectToRabbitMQ(workerServer)
      .then(p => { publisher = p })
  })
  after('Disconnect from RabbitMQ', () => {
    return testUtil.disconnectToRabbitMQ(publisher, workerServer)
  })

  beforeEach('Connect to RabbitMQ', () => rabbitMQ.connect())
  afterEach('Disconnect from RabbitMQ', () => rabbitMQ.disconnect())

  // Delete everything from the DB after every test
  beforeEach(() => testUtil.truncateAllTables())

  // Set GH stubs
  before(done => githubAPI.start(done))
  after(done => githubAPI.stop(done))

  before(() => {
    githubAPI.stub('GET', `/user/${userGithubId}?access_token=testing`).returns({
      status: 200,
      body: githubUserFixture
    })
  })

  it('should create an user', () => {
    return publisher.publishTask('user.create', {
      githubId: userGithubId,
      accessToken: 'asdsadasdasdasdasdsadsad'
    })
      .then(() => {
        return testUtil.poll(Promise.method(() => {
          // Make a GET request every 100ms to check if org exists
          return request
            .get(`http://localhost:${process.env.PORT}/user`)
            .query({ githubId: userGithubId })
            .then(res => {
              let orgs = res.body
              if (Array.isArray(orgs) && orgs.length > 0) {
                expect(orgs).to.have.lengthOf(1)
                expect(orgs[0]).to.have.property('id')
                expect(orgs[0]).to.have.property('githubId', userGithubId)
                return true
              }
              return false
            })
        }), 100, 5000)
      })
  }).timeout(5000)

  it('should create an user on the authorized event', () => {
    return publisher.publishEvent('user.authorized', {
      githubId: userGithubId,
      accessToken: 'asdsadasdasdasdasdsadsad'
    })
      .then(() => {
        return testUtil.poll(Promise.method(() => {
          // Make a GET request every 100ms to check if org exists
          return request
            .get(`http://localhost:${process.env.PORT}/user`)
            .query({ githubId: userGithubId })
            .then(res => {
              let orgs = res.body
              if (Array.isArray(orgs) && orgs.length > 0) {
                expect(orgs).to.have.lengthOf(1)
                expect(orgs[0]).to.have.property('id')
                expect(orgs[0]).to.have.property('githubId', userGithubId)
                return true
              }
              return false
            })
        }), 100, 5000)
      })
  }).timeout(5000)
})
