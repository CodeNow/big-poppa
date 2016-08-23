'use strict'

const Promise = require('bluebird')
const MongoClient = require('mongodb').MongoClient
const moment = require('moment')

const logger = require('util/logger').child({ module: 'scripts/user-whitelist-migration-script' })
const Organization = require('models/organization')
const GithubEntityError = require('errors/github-entity-error')
const NotFoundError = require('errors/not-found-error')

// Set all orgs on a trial until October 1st 2016
const trialEndDate = process.env.TRIAL_END_DATE || '10-01-2016'

const maxNumberOfRetries = 5

// Either set MONGO env with connection query or set host, port and db separately
const mongoHost = process.env.MONGODB_HOST || 'localhost'
const mongoPort = process.env.MONGODB_PORT || 27017
const mongoDatabase = process.env.MONGODB_DB || 'userwhitelist_test'
const url = process.env.MONGO || `mongodb://${mongoHost}:${mongoPort}/${mongoDatabase}`

var log = logger.child({})

// Global variables meant to be used reporting/logging at the end of script
let numberOfUserWhitelist = null
let numberOfUserWhitelistWithNoGithubIds = null
let numberOf504Errors = 0
let orgsThatDoNotExistInGithub = []
let orgsThatCouldNotBeCreated = []
let orgsSuccessfullyCreated = []
let orgsWithNotGithubId = []

const createOrganization = (userWhitelist, retries) => {
  const uwLog = log.child({ userWhitelist: userWhitelist, retries: retries, method: 'createOrganization' })
  uwLog.info('createOrganization called')
  retries = retries || 0

  return Organization.fetchByGithubId(userWhitelist.githubId)
    // Only attempt to create the org if the org doesn't exist
    .catch(NotFoundError, () => Organization.create(userWhitelist.githubId))
    .then(() => {
      orgsSuccessfullyCreated.push(userWhitelist.name)
      return true // Include org in final array of whitelists
    })
    .catch(GithubEntityError, err => {
      uwLog.error({ err: err, userWhitelist: userWhitelist }, 'UserWhitelist is not a Github Org')
      orgsThatDoNotExistInGithub.push(userWhitelist.name)
      return false // Filter org out if it's not a GH org
    })
    .catch(err => {
      if (err.code === '504') {
        uwLog.trace({ err: err }, '504 error encountered')
        numberOf504Errors += 1
        if (retries === maxNumberOfRetries) {
          uwLog.error({ err: err }, 'Max number of retries reached')
          throw new Error(`Organization was not inserted after ${maxNumberOfRetries}`)
        }
        uwLog.trace('Retrying to createOrganization')
        return Promise.delay(200)
          .then(() => createOrganization(userWhitelist, retries + 1))
      }
      uwLog.error({ err: err, userWhitelist: userWhitelist }, 'Error creating organization')
      orgsThatCouldNotBeCreated.push(userWhitelist.name)
      return false // Filter out org if it failed
    })
}

function updateOrganization (userWhitelist) {
  log.trace({ userWhitelist: userWhitelist }, 'Fetching Organization by githubId')
  return Organization.fetchByGithubId(userWhitelist.githubId)
    .then(org => {
      log.trace({ org: org }, 'Update organization')
      let updates = {
        firstDockCreated: userWhitelist.firstDockCreated || false
      }
      if (!org.get('stripeCustomerId')) {
        // Only update the `trialEnd` if they are NOT in Stripe
        updates.trialEnd = moment(trialEndDate, 'MM-DD-YYYY').toDate()
      }
      return org.save(updates)
    })
    .tap(function (orgResult) {
      log.trace({ orgResult: orgResult }, 'Update organization')
    })
}

const getUnaccountedForOrgs = (userWhitelists) => {
  return userWhitelists
    .map(userWhitelist => userWhitelist.name)
    .filter(name => {
      if (orgsSuccessfullyCreated.indexOf(name) !== -1) return false
      if (orgsThatDoNotExistInGithub.indexOf(name) !== -1) return false
      if (orgsThatCouldNotBeCreated.indexOf(name) !== -1) return false
      return true
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
  .then(function fetctWhitelists (db) {
    log.info('Fetching all documents for userwhitelists')
    let userWhitelistCollection = db.collection('userwhitelists')
    return Promise.fromCallback(cb => {
      userWhitelistCollection.find({}).toArray(cb)
    })
  })
  .then(function filterWhitelistsToWhitelistsWithGithubIds (unFilteredUserWhitelists) {
    orgsWithNotGithubId = unFilteredUserWhitelists.filter(x => !x.githubId).map(x => x.name || x)
    let userWhitelists = unFilteredUserWhitelists.filter(x => !!x.githubId)
    log.trace({
      numberOfUserWhitelist: userWhitelists.length,
      orgsWithNotGithubId: orgsWithNotGithubId.length
    }, 'UserWhitelists fetched')
    return userWhitelists
  })
  .then(function createOrganizationsFromWhitelists (userWhitelistsWithGithubId) {
    log.trace('Create all organizations from whitelists. Filter whitelists that dont exist on Github or failed')
    return Promise.filter(userWhitelistsWithGithubId, createOrganization)
  })
  .tap(function (userWhitelists) {
    log.trace({ numberOfUserWhitelistOrgsToUpdates: userWhitelists.length }, 'Update newly created orgs')
    return Promise.each(userWhitelists, updateOrganization)
  })
  .catch(err => log.error({ err: err }, 'Unhandeled error'))
  .then(function logMigrationResults (userWhitelists) {
    log.trace({
      orgsSuccessfullyCreated: orgsSuccessfullyCreated,
      orgsWithNotGithubId: orgsWithNotGithubId,
      orgsThatCouldNotBeCreated: orgsThatCouldNotBeCreated
    }, 'All orgs updated')

    // Check if any org is unaccounted for
    let orgsUnaccountedFor = getUnaccountedForOrgs(userWhitelists)

    // Provide a summary of everything that happened
    log.info({
      numberOfUserWhitelist: numberOfUserWhitelist,
      numberOfUserWhitelistWithNoGithubIds: numberOfUserWhitelistWithNoGithubIds,
      numberOfUserWhitelistsThatDoNotExistInGithub: orgsThatDoNotExistInGithub.length,
      numberOfSucessfullyCreatedOrgs: orgsSuccessfullyCreated.length,
      numberOfErroredOrgs: orgsThatCouldNotBeCreated.length,
      numberOf504Errors: numberOf504Errors,
      orgsWithNotGithubId: orgsWithNotGithubId,
      orgsSuccessfullyCreated: orgsSuccessfullyCreated,
      orgsThatDoNotExistInGithub: orgsThatDoNotExistInGithub,
      orgsThatCouldNotBeCreated: orgsThatCouldNotBeCreated,
      orgsUnaccountedFor: orgsUnaccountedFor
    }, 'Finished. Exiting.')
    process.exit()
  })
