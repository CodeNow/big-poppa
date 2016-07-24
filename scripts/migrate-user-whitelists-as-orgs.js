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

let log = logger.child({})

let numberOfUserWhitelist = null
let numberOfUserWhitelistWithNoGithubIds = null
let numberOf504Errors = 0

let userWhitelists
let orgsThatDoNotExistInGithub = []
let orgsThatCouldNotBeCreated = []
let orgsSuccsefullyCreated = []
let orgsWithNotGithubId = []

log.info({ url: url }, 'Connecting to Database')
Promise.resolve()
  .then(() => Promise.fromCallback(cb => MongoClient.connect(url, cb)))
  .then(db => {
    log.info('Fetching all documents for userwhitelists')
    let userWhitelistCollection = db.collection('userwhitelists')
    return Promise.fromCallback(cb => {
      userWhitelistCollection.find({}).toArray(cb)
    })
  })
  .then(unFilteredUserWhitelists => {
    orgsWithNotGithubId = unFilteredUserWhitelists.filter(x => !x.githubId).map(x => x.name || x)
    userWhitelists = unFilteredUserWhitelists.filter(x => !!x.githubId)

    log.trace({
      numberOfUserWhitelist: userWhitelists.length,
      orgsWithNotGithubId: orgsWithNotGithubId.length
    }, 'UserWhitelists fetched')

    const createOrganization = (userWhitelist, retries) => {
      const wlog = log.child({ userWhitelist: userWhitelist, retries: retries, method: 'createOrganization' })
      wlog.info('createOrganization called')
      retries = retries || 0

      return Organization.fetchByGithubId(userWhitelist.githubId)
        // Only attempt to create the org if the org doesn't exist
        .catch(NotFoundError, () => Organization.create(userWhitelist.githubId))
        .then(() => {
          orgsSuccsefullyCreated.push(userWhitelist.name)
          return true
        })
        .catch(GithubEntityError, err => {
          wlog.error({ err: err, userWhitelist: userWhitelist }, 'UserWhitelist is not a Github Org')
          orgsThatDoNotExistInGithub.push(userWhitelist.name)
          return false // Filter org out
        })
        .catch(err => {
          if (err.code === '504') {
            wlog.trace({ err: err }, '504 error encountered')
            numberOf504Errors += 1
            if (retries === maxNumberOfRetries) {
              wlog.error({ err: err }, 'Max number of retries reached')
              throw new Error(`Organization was not inserted after ${maxNumberOfRetries}`)
            }
            wlog.trace('Retrying to createOrganization')
            return Promise.delay(200)
              .then(() => createOrganization(userWhitelist, retries + 1))
          }
          wlog.error({ err: err, userWhitelist: userWhitelist }, 'Error creating organization')
          orgsThatCouldNotBeCreated.push(userWhitelist.name)
          return false // Filter out org
        })
    }

    log.trace('Filter whitelists')
    return Promise.filter(userWhitelists, createOrganization)
  })
  .then(userWhitelists => {
    log.trace({ numberOfUserWhitelistOrgsToUpdates: userWhitelists.length }, 'Update newly created orgs')
    return Promise.map(userWhitelists, userWhitelist => {
      log.trace({ userWhitelist: userWhitelist }, 'Fetching Organization by githubId')
      return Organization.fetchByGithubId(userWhitelist.githubId)
        .then(org => {
          return Promise.props({
            userWhitelist: userWhitelist,
            org: org.save({
              trialEnd: moment(trialEndDate, 'MM-DD-YYYY').toDate(),
              firstDockCreated: userWhitelist.firstDockCreated || false
            })
          })
        })
    })
  })
  .catch(err => log.error({ err: err }, 'Unhandeled error'))
  .then(orgsAndWhitelists => {
    log.trace({
      orgsAndWhitelists: orgsAndWhitelists,
      orgsSuccsefullyCreated: orgsSuccsefullyCreated,
      orgsWithNotGithubId: orgsWithNotGithubId,
      orgsThatCouldNotBeCreated: orgsThatCouldNotBeCreated
    }, 'All orgs updated')

    let orgsUnaccountedFor = orgsAndWhitelists
      .map(orgAndWhitelist => orgAndWhitelist.userWhitelist.name)
      .filter(name => {
        if (orgsSuccsefullyCreated.indexOf(name) !== -1) return false
        if (orgsThatDoNotExistInGithub.indexOf(name) !== -1) return false
        if (orgsThatCouldNotBeCreated.indexOf(name) !== -1) return false
        return true
      })

    log.info({
      numberOfUserWhitelist: numberOfUserWhitelist,
      numberOfUserWhitelistWithNoGithubIds: numberOfUserWhitelistWithNoGithubIds,
      numberOfUserWhitelistsThatDoNotExistInGithub: orgsThatDoNotExistInGithub.length,
      numberOfSucessfullyCreatedOrgs: orgsSuccsefullyCreated.length,
      numberOfErroredOrgs: orgsThatCouldNotBeCreated.length,
      numberOf504Errors: numberOf504Errors,
      orgsWithNotGithubId: orgsWithNotGithubId,
      orgsSuccsefullyCreated: orgsSuccsefullyCreated,
      orgsThatDoNotExistInGithub: orgsThatDoNotExistInGithub,
      orgsThatCouldNotBeCreated: orgsThatCouldNotBeCreated,
      orgsUnaccountedFor: orgsUnaccountedFor
    }, 'Finished. Exiting.')
    process.exit()
  })
