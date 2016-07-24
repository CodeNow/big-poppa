'use strict'

const Promise = require('bluebird')
const expect = require('chai').expect
const superagentPromisePlugin = require('superagent-promise-plugin')
const request = superagentPromisePlugin.patch(require('superagent'))
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const testUtil = require('../util')
const githubOrganizationFixture = require('../fixtures/github/organization')
const MockAPI = require('mehpi')
const githubAPI = new MockAPI(process.env.GITHUB_VARNISH_PORT)

const RabbitMQ = require('ponos/lib/rabbitmq')

const workerServer = require('workers/server')
const httpsServer = require('http/server')

describe('Organization Integration Test', () => {
  let orgGithubId = 2828361
  let publisher

  // Start HTTPS Server
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
    githubAPI.stub('GET', `/user/${orgGithubId}?access_token=testing`).returns({
      status: 200,
      body: githubOrganizationFixture
    })
  })

  it('should create an organization', () => {
    return publisher.publishTask('organization.create', {
      githubId: orgGithubId,
      creator: {
        githubUsername: 'thejsj',
        email: 'jorge.silva@thejsj.com',
        created: '1469136162'
      }
    })
    .then(() => {
      return testUtil.poll(Promise.method(() => {
        // Make a GET request every 100ms to check if org exists
        return request
          .get(`http://localhost:${process.env.HTTPS_PORT}/organization`)
          .query({ githubId: orgGithubId })
          .then(res => {
            let orgs = res.body
            if (Array.isArray(orgs) && orgs.length > 0) {
              expect(orgs).to.have.lengthOf(1)
              expect(orgs[0]).to.have.property('id')
              expect(orgs[0]).to.have.property('githubId', orgGithubId)
              return true
            }
            return false
          })
      }), 100, 5000)
    })
  }).timeout(5000)
})
