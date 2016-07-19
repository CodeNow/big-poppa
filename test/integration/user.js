'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect
const request = Promise.promisifyAll(require('superagent'))
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const testUtil = require('../util')
const githubUserFixture = require('../fixtures/github/user')
const MockAPI = require('mehpi')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)

const RabbitMQ = require('ponos/lib/rabbitmq')

const workerServer = require('workers/server')
const httpsServer = require('http/server')

describe('User Integration Test', () => {
  let userGithubId = 1981198
  let publisher

  // Start HTTP Server
  before(() => httpsServer.start())
  after(() => httpsServer.stop())

  // Start Worker Server
  before(() => workerServer.start())
  after(() => workerServer.stop())

  // Conect to RabbitMQ
  beforeEach(() => {
    publisher = new RabbitMQ({
      name: process.env.APP_NAME + '-test',
      hostname: process.env.RABBITMQ_HOSTNAME,
      port: process.env.RABBITMQ_PORT,
      username: process.env.RABBITMQ_USERNAME,
      password: process.env.RABBITMQ_PASSWORD
    })
    return publisher.connect()
  })
  afterEach(() => publisher.disconnect())

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
      githubId: userGithubId
    })
    .then(() => {
      return testUtil.poll(Promise.method(() => {
        // Make a GET request every 100ms to check if org exists
        return request
          .get(`https://localhost:${process.env.HTTPS_PORT}/user`)
          .query({ github_id: userGithubId })
          .then(res => {
            let orgs = res.body
            if (Array.isArray(orgs) && orgs.length > 0) {
              expect(orgs).to.have.lengthOf(1)
              expect(orgs[0]).to.have.property('id')
              expect(orgs[0]).to.have.property('github_id', userGithubId)
              return true
            }
            return false
          })
      }), 100, 5000)
    })
  }).timeout(5000)
})