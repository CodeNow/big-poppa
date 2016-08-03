'use strict'

const Promise = require('bluebird')
const MongoClient = require('mongodb').MongoClient

const logger = require('util/logger').child({ module: 'scripts/user-whitelist-migration-script' })
const User = require('models/user')
const NotFoundError = require('errors/not-found-error')

// Set all orgs on a trial until October 1st 2016
const CreateUser = require('workers/user.create')

const maxNumberOfRetries = 5

// Either set MONGO env with connection query or set host, port and db separately
const mongoHost = process.env.MONGODB_HOST || 'localhost'
const mongoPort = process.env.MONGODB_PORT || 27020
const mongoDatabase = process.env.MONGODB_DB || 'userwhitelist_test'
const url = process.env.MONGO || `mongodb://${mongoHost}:${mongoPort}/${mongoDatabase}`

var log = logger.child({})

// Global variables meant to be used reporting/logging at the end of script

let numberOf504Errors = 0
let usersThatCouldNotBeCreated = []
let usersSuccessfullyCreated = []

function createUser (user, retries) {
  const createUserLog = log.child({ user: user, retries: retries, method: 'createUser' })
  retries = retries || 0
  const githubUserId = user.accounts.github.id

  return User.fetchByGithubId(githubUserId)
    .then((user) => {
      createUserLog.trace({ userId: user.githubId }, 'updating access token')
      return user.save({
        accessToken: user.accounts.github.accessToken
      })
    })
    // Only attempt to create the org if the org doesn't exist
    .catch(NotFoundError, () => {
      return CreateUser({
        githubId: githubUserId,
        accessToken: user.accounts.github.accessToken
      })
    })
    .then(() => {
      usersSuccessfullyCreated.push(user)
      return true // Include org in final array of whitelists
    })
    .catch(err => {
      if (err.code === '504') {
        createUserLog.trace({ err: err }, '504 error encountered')
        numberOf504Errors += 1
        if (retries === maxNumberOfRetries) {
          createUserLog.error({ err: err }, 'Max number of retries reached')
          throw new Error(`User was not inserted after ${maxNumberOfRetries}`)
        }
        createUserLog.trace('Retrying to createOrganization')
        return Promise.delay(200)
          .then(() => createUser(user, retries + 1))
      }
      createUserLog.error({ err: err }, 'Error creating organization')
      usersThatCouldNotBeCreated.push(user)
      return false // Filter out org if it failed
    })
}

log.info({ url: url }, 'Connecting to Database')
Promise.resolve()
  .then(() => Promise.fromCallback(cb => {
    let opts = {}
    if (process.env.MONGO_REPLSET_NAME) {
      opts.replset = {
        rs_name: process.env.MONGO_REPLSET_NAME
      }
    }
    MongoClient.connect(url, opts, cb)
  }))
  .then(function fetchUsersFromMongo (db) {
    log.info('Fetching all documents for userwhitelists')
    let userCollection = db.collection('users')
    return Promise.fromCallback(cb => {
      userCollection.find({ 'accounts.github.id': {
        $exists: true
      }}).toArray(cb)
    })
  })
  .then(function migrateUsersFromMongo (users) {
    log.trace('Create all users from whitelists. Filter whitelists that dont exist on Github or failed')
    return Promise.map(users, createUser)
  })
  .catch(err => log.error({ err: err }, 'Unhandeled error'))
  .then(function logMigrationResults () {
    log.trace({
      usersSuccessfullyCreated: usersSuccessfullyCreated,
      usersThatCouldNotBeCreated: usersThatCouldNotBeCreated
    }, 'All orgs updated')

    // Provide a summary of everything that happened
    log.info({
      usersSuccessfullyCreated: usersSuccessfullyCreated.length,
      usersThatCouldNotBeCreated: usersThatCouldNotBeCreated.length
    }, 'Finished. Exiting.')
    process.exit()
  })
