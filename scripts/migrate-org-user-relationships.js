'use strict'

const logger = require('util/logger').child({ module: 'scripts/user-whitelist-migration-script' })
const User = require('models/user')

const GithubAPI = require('util/github')
const AddUserToOrganization = require('workers/organization.user.add')

var log = logger.child({})

// Global variables meant to be used reporting/logging at the end of script
let totalMembershipsCreated = []
let alreadyMembershipsCreated = []
let usersWithNoOrgs = []
let badUsers = []

User.collection()
  .fetch()
  .then(users => users.toJSON())
  .tap(function (orgs) {
    log.trace({
      orgs: orgs
    }, 'fetch orgs')
  })
  .map(function (user) {
    const githubApi = new GithubAPI(user.accessToken)
    return githubApi.getOrgsForUser(user.githubId)
      .tap(function (orgs) {
        if (!orgs.length) {
          usersWithNoOrgs.push(user)
        }
      })
      .map(function (org) {
        log.trace({
          org: org,
          member: user
        }, 'Update newly created orgs')
        // If the org doesn't exist in our db, it'll just worker_stop
        return AddUserToOrganization({
          tid: 'dasdasdsasadasd',
          organizationGithubId: org.githubId,
          userGithubId: user.id
        })
          .tap(function (membership) {
            totalMembershipsCreated.push(membership)
          })
          .catch(err => {
            log.error({ err: err }, 'Error creating relationships')
          })
      })
  })
  .catch(err => log.error({ err: err }, 'Unhandeled error'))
  .then(function logMigrationResults () {
    log.trace({
      totalMembershipsCreated: totalMembershipsCreated.length,
      alreadyMembershipsCreated: alreadyMembershipsCreated.length,
      orgsWithNoUsers: usersWithNoOrgs.length,
      badOrgs: badUsers.length
    }, 'Finished. Exiting.')
    process.exit()
  })
