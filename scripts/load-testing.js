'use strict'
require('loadenv')()

const Promise = require('bluebird')
const BigPoppa = require('../client')
const bigPoppaClient = new BigPoppa(process.env.BIG_POPPA_HOST)

const logger = require('util/logger').child({ module: 'scripts/load-testing' })

const NUMBER_OF_REQUESTS = process.env.NUMBER_OF_REQUESTS || 200

let allGithubIds
let allIds

const getRandomEntry = (arr) => arr[Math.floor(Math.random() * arr.length)]

let numberOfRequests = 0
let allDurations = []
let numberOfErrors = 0

const errorHandler = (err) => {
  numberOfErrors += 1
  log.error({ err: err.message }, 'Error')
}

const decorateRequeuest = (func, name) => {
  return () => {
    numberOfRequests += 1
    log.trace({ numberOfRequests }, `Calling ${name}`)
    let now = Date.now()
    return func()
      .tap(() => {
        let duration = Date.now() - now
        allDurations.push(duration)
        log.trace({ duration }, `Duration: ${name}`)
      })
      .catch(errorHandler)
  }
}

// Get all organizations
const getAllOrgs = decorateRequeuest(bigPoppaClient.getOrganizations.bind(bigPoppaClient), 'getAllOrgs')

// Get organization by githubId
const getOrgByGithubId = decorateRequeuest(() => bigPoppaClient.getOrganizations({ githubId: getRandomEntry(allGithubIds) }), 'getOrgByGithubId')

// Get organization by id
const getOrgById = decorateRequeuest(() => bigPoppaClient.getOrganization(getRandomEntry(allIds)), 'getOrgById')

// Get array of X
const getArray = (x) => Array.from(new Array(x)).map((_, x) => x)

// First, get all orgs
const log = logger.child({ numberOfRequests, host: process.env.BIG_POPPA_HOST })

log.info('Start')
console.time('load-testing')

getAllOrgs()
  .then(allOrgs => {
    log.trace({ numberOfOrgs: allOrgs && allOrgs.length }, 'Number of Orgs')
    allGithubIds = allOrgs.map(o => o.githubId)
    allIds = allOrgs.map(o => o.id)
    return Promise.all([
      Promise.mapSeries(getArray(NUMBER_OF_REQUESTS), getOrgByGithubId),
      // By Github id
      Promise.mapSeries(getArray(NUMBER_OF_REQUESTS), getAllOrgs),
      Promise.mapSeries(getArray(NUMBER_OF_REQUESTS), getAllOrgs),
      Promise.mapSeries(getArray(NUMBER_OF_REQUESTS), getAllOrgs),
      // By Id
      Promise.mapSeries(getArray(NUMBER_OF_REQUESTS), getOrgById),
      Promise.mapSeries(getArray(NUMBER_OF_REQUESTS), getOrgById),
      Promise.mapSeries(getArray(NUMBER_OF_REQUESTS), getOrgById)
    ])
  })
  .then(() => {
    console.timeEnd('load-testing')
    let totalDuration = allDurations.reduce((p, c) => p + c, 0)
    let averageDuration = totalDuration / allDurations.length
    log.trace({
      averageDuration,
      numberOfErrors,
      numberOfRequests
    }, 'Finish')
  })
