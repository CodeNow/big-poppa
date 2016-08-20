'use strict'

const logger = require('util/logger').child({ module: 'scripts/user-whitelist-migration-script' })
const User = require('models/user')
const MongoClient = require('mongodb').MongoClient
const keypather = require('keypather')()
const rabbitMQ = require('util/rabbitmq')
const Promise = require('bluebird')

const Organization = require('models/organization')

// Either set MONGO env with connection query or set host, port and db separately
const mongoHost = process.env.MONGODB_HOST || 'localhost'
const mongoPort = process.env.MONGODB_PORT || 27020
const mongoDatabase = process.env.MONGODB_DB || 'userwhitelist_test'
const url = process.env.MONGO || `mongodb://${mongoHost}:${mongoPort}/${mongoDatabase}`
var log = logger.child({})

// Global variables meant to be used reporting/logging at the end of script
let totalMembershipsCreated = []
let alreadyMembershipsCreated = []
let orgDidntExist = []
let usersWithNoOrgs = []
let badUsers = []
let orgsThatFailed = []
let userHadNoLocation = []
rabbitMQ.connect()
/**
 * This fetches all of the orgs each user belongs to, and attempts to create the relationships for each one.  If the org
 * doesn't exist in our system, AddUserToOrganization will throw an error, which we just ignore.
 */
function addUserToAllGithubOrgs (db, jsonUser) {
  log.info('Fetching all documents for user')
  let userCollection = db.collection('users')
  return Promise.fromCallback(cb => {
    userCollection.findOne({ 'accounts.github.id': jsonUser.githubId }, cb)
  })
    .then(mongoUser => {
      let orgName = keypather.get(mongoUser, 'userOptions.uiState.previousLocation.org')
      log.trace({
        orgName: orgName,
        mongoUser: keypather.get(mongoUser, 'accounts.github.username')
      }, 'Attaching user to org')
      if (!orgName) {
        throw new Error('Could not find previousLocation')
      }
      return Promise.all([
        Organization.fetch({ lowerName: orgName.toLowerCase() }),
        User.fetchById(jsonUser.id)
      ])
        .spread(function (org, user) {
          log.trace({
            org: org,
            member: user,
            orgName: orgName
          }, 'Update newly created orgs')
          // Don't use the model function, since it will hurt intercom
          // Also, if the user org relationship already exists, then it'll just .catch
          return org.users().attach(user.get(user.idAttribute))
            .tap(membership => {
              totalMembershipsCreated.push(membership)
            })
            .catch(err => {
              if (/Organization or user was not found/.test(err.message)) {
                orgDidntExist.push(orgName)
              } else if (/User already added to organization/.test(err.message)) {
                alreadyMembershipsCreated.push(orgName)
              } else {
                orgsThatFailed.push(orgName)
                log.error({ err: err }, 'Error creating relationships')
              }
            })
        })
    })
    .catch(err => {
      if (/Could not find previousLocation/.test(err.message)) {
        userHadNoLocation.push(jsonUser)
      } else {
        log.error({ err: err }, `Error creating relationships for ${jsonUser.githubId}`)
      }
    })
}
Promise.fromCallback(cb => {
  let opts = {}
  if (process.env.MONGO_REPLSET_NAME) {
    opts.replset = {
      rs_name: process.env.MONGO_REPLSET_NAME
    }
  }
  MongoClient.connect(url, opts, cb)
})
  .then((db) => {
    return User.collection()
      .fetch()
      .then(users => users.toJSON())
      .then(users => {
        log.trace({
          users: users
        }, 'fetch users')
        return Promise.mapSeries(users, (user) => {
          return addUserToAllGithubOrgs(db, user)
        })
      })
      .catch(err => log.error({ err: err }, 'Unhandeled error'))
      .finally(function logMigrationResults () {
        log.trace({
          totalMembershipsCreated: totalMembershipsCreated.length,
          alreadyMembershipsCreated: alreadyMembershipsCreated.length,
          orgsWithNoUsers: usersWithNoOrgs.length,
          orgsThatFailed: orgsThatFailed.length,
          orgDidntExist: orgDidntExist.length,
          userHadNoLocation: userHadNoLocation.length,
          badOrgs: badUsers.length
        }, 'Finished. Exiting.')
        rabbitMQ.disconnect()
        process.exit()
      })
  })
