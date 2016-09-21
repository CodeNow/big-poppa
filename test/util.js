'use strict'

const Promise = require('bluebird')
const bookshelf = require('models').bookshelf
const request = require('request-promise')
const knex = bookshelf.knex
const RabbitMQ = require('ponos/lib/rabbitmq')

const User = require('models/user')
const Organization = require('models/organization')

module.exports = class TestUtil {

  static truncateAllTables () {
    return knex('organizations_users').truncate()
      .then(() => {
        return Promise.all([
          // Cannot truncate because of foreign key constraint
          knex('organizations_users').del(),
          knex('organizations').del(),
          knex('users').del()
        ])
      })
  }

  static createUser (userGithubId, token) {
    return new User().save({
      accessToken: token || process.env.GITHUB_TOKEN || 'testing',
      githubId: userGithubId
    })
  }

  static createUserAndOrg (orgGithubId, userGithubId) {
    return Promise.props({
      user: new User().save({
        accessToken: process.env.GITHUB_TOKEN || 'testing',
        githubId: userGithubId
      }),
      org: Organization.create(orgGithubId)
    })
  }

  static createAttachedUserAndOrg (orgGithubId, userGithubId) {
    return this.createUserAndOrg(orgGithubId, userGithubId)
      .tap(res => {
        let user = res.user
        let org = res.org
        return org.users().attach(user.get(user.idAttribute))
      })
  }

  static poll (handler, interval, timeout) {
    function pollRecursive () {
      return handler()
        .then(bool => {
          if (bool) return true
          return Promise.delay(interval).then(pollRecursive)
        })
    }

    return pollRecursive()
      .timeout(timeout)
  }

  static getRabbitAPIRequestOpts (urlEnd, method) {
    let url = `http://${process.env.RABBITMQ_HOSTNAME}:${process.env.RABBITMQ_ADMIN_PORT}/api${urlEnd}`
    return {
      method: method || 'GET',
      uri: url,
      headers: {
        'User-Agent': 'Request-Promise'
      },
      auth: {
        user: process.env.RABBITMQ_USERNAME,
        pass: process.env.RABBITMQ_PASSWORD
      },
      json: true
    }
  }

  static deleteAllQueues () {
    return request(TestUtil.getRabbitAPIRequestOpts('/queues'))
      .then(queues => {
        queues = queues.filter(x => !!x.name)
        return Promise.map(queues, (queue) => {
          return request(TestUtil.getRabbitAPIRequestOpts(`/queues/%2f/${queue.name}`, 'DELETE'))
        })
      })
  }

  static deleteAllExchanges () {
    return request(TestUtil.getRabbitAPIRequestOpts('/exchanges'))
      .then(exchanges => {
        exchanges = exchanges.filter(x => !!x.name && !x.name.match(/^amq/))
        return Promise.map(exchanges, (exchange) => {
          return request(TestUtil.getRabbitAPIRequestOpts(`/exchanges/%2f/${exchange.name}`, 'DELETE'))
        })
      })
  }

  static deleteAllExchangesAndQueues () {
    return Promise.join(
      TestUtil.deleteAllExchanges(),
      TestUtil.deleteAllQueues()
    )
  }

  static throwIfSuccess () {
    throw new Error('Should not be called')
  }

  static connectToRabbitMQ (workerServer, taskNames, eventNames) {
    let allTaskNames = Array.from(workerServer._tasks.keys()) // ES6 Map
    let allEventNames = Array.from(workerServer._events.keys()) // ES6 Map
    allTaskNames = allTaskNames.concat(taskNames || [])
    allEventNames = allEventNames.concat(eventNames || [])
    let publisher = new RabbitMQ({
      name: process.env.APP_NAME,
      hostname: process.env.RABBITMQ_HOSTNAME,
      port: process.env.RABBITMQ_PORT,
      username: process.env.RABBITMQ_USERNAME,
      password: process.env.RABBITMQ_PASSWORD,
      tasks: allTaskNames,
      events: allEventNames
    })
    return publisher.connect()
      .then(() => workerServer.start())
      .return(publisher)
  }

  static disconnectToRabbitMQ (publisher, workerServer) {
    return publisher.disconnect()
      .then(() => workerServer.stop())
  }
}
