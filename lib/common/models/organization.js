'use strict'

const Promise = require('bluebird')
const moment = require('moment')
const keypather = require('keypather')()

const BaseModel = require('common/models/base')

const logger = require('common/logger').create('models', {}).child({ module: 'models/organization' })
const GithubAPI = require('common/github')

const GithubEntityError = require('common/errors/github-entity-error')

const Organization = BaseModel.extend('Organization', {

  /**
   * Main model properties
   */

  tableName: 'organization',
  hasTimestamps: true,
  idAttribute: 'id',
  users: function () {
    return this.belongsToMany('User')
  },

  /**
   * Prototype Methods
   */

  initialize: function () {
    BaseModel.prototypeMethods.initialize.apply(this, arguments)
    this.on('creating', this.validateCreate)
  },

  validateCreate: Promise.method(function (model, attrs) {
    const log = this.log.child({ method: 'Organization.validateSave' })
    log.info('Organization.validateSave called')
    return GithubAPI.getOrganization(attrs.github_id)
      .tap(org => {
        log.trace({ org: org }, 'Organization fetched from Github')
      })
  }),

  addUser: Promise.method(function (user, opts) {
    const log = logger.child({
      organizationGithubId: this.get(this.idAttribute),
      userGithubId: keypather.get(user, 'toJSON()'),
      opts: opts,
      method: 'Orgainization.addUser'
    })
    log.info('Organization.addUser called')
    if (!user) {
      // TODO: Change name of error
      throw new GithubEntityError('User does not exist')
    }
    return this.users().attach(user.get(user.idAttribute), opts)
      .catch(Organization.castDatabaseError.bind(Organization))
      .tap(() => {
        log.trace('User added to organization')
      })
  }),

  removeUser: Promise.method(function (user, opts) {
    const log = logger.child({
      organizationGithubId: this.get(this.idAttribute),
      opts: opts,
      method: 'Orgainization.removeUser'
    })
    log.info('Organization.removeUser called')
    if (!user) {
      // TODO: Change error
      throw new GithubEntityError('User does not exist')
    }
    return this.users().detach(user.get(user.idAttribute), opts)
      .catch(Organization.castDatabaseError.bind(Organization))
      .tap(() => {
        log.trace('User removed from organization')
      })
  }),

  getAllUserIds: Promise.method(function (opts) {
    const log = this.log.child({ id: this.get(this.idAttribute), method: 'Organization.getAllUserIds' })
    log.info('Organization.getAllUserIds called')
    opts = Object.assign({}, opts, { withRelated: ['users'] })
    return this.fetch(opts)
      .then(models => models.toJSON().users)
      .map(o => o.id)
  })

}, {

  /**
   * Static methods
   */

  create: Promise.method((githubId, opts) => {
    const log = logger.child({ githubId: githubId, method: 'Orgainization.create' })
    log.info('Organization.create called')
    return new Organization()
      .save({
        // By default all newly created orgs should be inactive
        github_id: githubId,
        trial_end: moment().utc().toDate(),
        active_period_end: moment().utc().toDate(),
        grace_period_end: moment().utc().toDate()
      }, opts)
  })

})

module.exports = Organization
