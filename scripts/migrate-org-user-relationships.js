'use strict'

const moment = require('moment')

const logger = require('util/logger').child({ module: 'scripts/user-whitelist-migration-script' })
const Organization = require('models/organization')
const GithubEntityNotFoundError = require('errors/github-entity-not-found-error')

const GithubAPI = require('util/github')

const AddUserToOrganization = require('workers/organization.user.add')

var log = logger.child({})

// Global variables meant to be used reporting/logging at the end of script
let totalMembershipsCreated = []
let alreadyMembershipsCreated = []
let orgsWithNoUsers = []
let badOrgs = []

Organization.collection()
  .fetch()
  .then(orgs => orgs.toJSON())
  .tap(function (orgs) {
    log.trace({
      orgs: orgs
    }, 'fetch orgs')
  })
  .map(function (org) {
    return GithubAPI.getOrganization(org.githubId)
      .tap(function (members) {
        if (!members) {
          orgsWithNoUsers.push(org)
          return
        }
        log.trace({
          org: org,
          members: members
        }, 'Update newly created orgs')
      })
      .map(function (member) {
        log.trace({
          org: org,
          member: member
        }, 'Update newly created orgs')
        return AddUserToOrganization({
          tid: 'dasdasdsasadasd',
          organizationGithubId: org.githubId,
          userGithubId: member.id
        })
          .tap(function (membership) {
            totalMembershipsCreated.push(membership)
          })
      })
      .catch(GithubEntityNotFoundError, err => {
        badOrgs.push(org)
      })
  })
  .catch(err => log.error({ err: err }, 'Unhandeled error'))
  .then(function logMigrationResults () {
    log.trace({
      totalMembershipsCreated: totalMembershipsCreated.length,
      alreadyMembershipsCreated: alreadyMembershipsCreated.length,
      orgsWithNoUsers: orgsWithNoUsers.length,
      badOrgs: badOrgs.length
    }, 'Finished. Exiting.')
    process.exit()
  })
