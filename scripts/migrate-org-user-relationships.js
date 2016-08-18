'use strict'

const logger = require('util/logger').child({ module: 'scripts/user-whitelist-migration-script' })
const User = require('models/user')
const Promise = require('bluebird')
const rabbitMQ = require('util/rabbitmq')

const GithubAPI = require('util/github')
const AddUserToOrganization = require('workers/organization.user.add')

var log = logger.child({})

// Global variables meant to be used reporting/logging at the end of script
let totalMembershipsCreated = []
let alreadyMembershipsCreated = []
let orgDidntExist = []
let usersWithNoOrgs = []
let badUsers = []
let orgsThatFailed = []
rabbitMQ.connect()
/**
 * This fetches all of the orgs each user belongs to, and attempts to create the relationships for each one.  If the org
 * doesn't exist in our system, AddUserToOrganization will throw an error, which we just ignore.
 */
function addUserToAllGithubOrgs (user) {
  const githubApi = new GithubAPI(user.accessToken)
  return githubApi.getOrgsForUser(user.githubId)
    .tap(orgs => {
      if (!orgs.length) {
        usersWithNoOrgs.push(user)
      }
    })
    .map(org => {
      log.trace({
        org: org,
        member: user
      }, 'Update newly created orgs')
      // If the org doesn't exist in our db, it'll just worker_stop
      return AddUserToOrganization({
        organizationGithubId: org.id,
        userGithubId: user.githubId
      })
        .tap(membership => {
          totalMembershipsCreated.push(membership)
        })
        .catch(err => {
          if (/Organization or user was not found/.test(err.message)) {
            orgDidntExist.push(org)
          } else if (/User already added to organization/.test(err.message)) {
            alreadyMembershipsCreated.push(org)
          } else {
            orgsThatFailed.push(org)
            log.error({ err: err }, 'Error creating relationships')
          }
        })
    })
    .catch(err => {
      log.error({ err: err }, `Error creating relationships for ${user.githubId}`)
    })
}

User.collection()
  .fetch()
  .then(users => users.toJSON())
  .then(users => {
    log.trace({
      users: users
    }, 'fetch users')
    return Promise.mapSeries(users, addUserToAllGithubOrgs)
  })
  .catch(err => log.error({ err: err }, 'Unhandeled error'))
  .then(function logMigrationResults () {
    log.trace({
      totalMembershipsCreated: totalMembershipsCreated.length,
      alreadyMembershipsCreated: alreadyMembershipsCreated.length,
      orgsWithNoUsers: usersWithNoOrgs.length,
      orgsThatFailed: orgsThatFailed.length,
      orgDidntExist: orgDidntExist.length,
      badOrgs: badUsers.length
    }, 'Finished. Exiting.')
    rabbitMQ.disconnect()
    process.exit()
  })
