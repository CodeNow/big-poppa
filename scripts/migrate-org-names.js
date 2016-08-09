'use strict'

const Promise = require('bluebird')
const logger = require('util/logger').child({ module: 'scripts/user-whitelist-migration-script' })
const Organization = require('models/organization')

const GithubAPI = require('util/github')

var log = logger.child({})

// Global variables meant to be used reporting/logging at the end of script
let totalUpdated = []

Organization.collection()
  .fetch()
  .then(orgs => {
    return Promise.mapSeries(orgs.models, org => {
      log.trace({
        org: org
      }, 'fetch org')
      const githubApi = new GithubAPI()
      return githubApi.getOrganization(org.get('githubId'))
        .then((githubOrg) => {
          return org.save({
            name: githubOrg.login
          })
        })
        .then((org) => {
          totalUpdated.push(org)
        })
    })
  })
  .catch(err => log.error({ err: err }, 'Unhandeled error'))
  .then(function logMigrationResults () {
    log.trace({
      totalUpdated: totalUpdated.length
    }, 'Finished. Exiting.')
    process.exit()
  })
