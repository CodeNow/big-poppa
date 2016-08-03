'use strict'

const logger = require('util/logger').child({ module: 'scripts/user-whitelist-migration-script' })
const User = require('models/user')
const Promise = require('bluebird')

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
  .then(function (users) {
    log.trace({
      users: users
    }, 'fetch users')
    return Promise
      .mapSeries(users, function (user) {
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
              organizationGithubId: org.id,
              userGithubId: user.githubId
            })
              .tap(function (membership) {
                totalMembershipsCreated.push(membership)
              })
              .catch(err => {
                alreadyMembershipsCreated.push(org)
                log.error({ err: err }, 'Error creating relationships')
              })
          })
          .catch(err => {
            log.error({ err: err }, `Error creating relationships for ${user.githubId}`)
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
