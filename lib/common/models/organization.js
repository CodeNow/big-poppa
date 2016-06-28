'use strict'

const Promise = require('bluebird')
const moment = require('moment')
const keypather = require('keypather')()

const bookshelf = require('./').bookshelf

const logger = require('common/logger').create('models', {}).child({ module: 'models/organization' })
const Util = require('common/util')
const GithubAPI = require('common/github')

const GithubEntityError = require('common/errors/github-entity-error')
const NoRowsDeletedError = require('common/errors/no-rows-deleted-error')

const Organization = bookshelf.model('Organization', {

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
    this.on('creating', this.validateCreate)
    // Logs
    this.on('saving', this.logSaving)
    this.on('saved', this.logSaved)
    this.on('destroying', this.logDestroying)
    this.on('destroyed', this.logDestroyed)
    this.log = logger.child({ model: 'Organization' })
  },

  validateCreate: Promise.method(function (model, attrs) {
    const log = this.log.child({ method: 'Organization.validateSave' })
    log.info('Organization.validateSave called')
    return GithubAPI.getOrganization(attrs.github_id)
      .then(org => {
        if (!org) {
          throw new GithubEntityError('Provided github ID is not a github organization.')
        }
        log.trace({ org: org }, 'Organization fetched from Github')
      })
  }),

  // Ovewrite `save` method
  save: Promise.method(function () {
    return bookshelf.Model.prototype.save.apply(this, arguments)
      .catch(Util.castDatabaseError)
  }),

  destroy: Promise.method(function () {
    return bookshelf.Model.prototype.destroy.apply(this, arguments)
      .catch(Util.castDatabaseError)
      .catch(Organization.NoRowsDeletedError, err => {
        throw new NoRowsDeletedError(`No org destroyed: ${err.toString()}`, { err: err })
      })
  }),

  logSaving: (model, attrs, opts) => {
    model.log.info({
      attrs: attrs,
      method: opts.method,
      query: opts.query.toString()
    }, 'Saving organization')
  },

  logSaved: (model, attrs, opts) => {
    model.log.info({
      attrs: attrs,
      method: opts.method,
      query: opts.query.toString()
    }, 'Saved organization')
  },

  logDestroying: (model, opts) => {
    model.log.info({
      method: opts.method,
      query: opts.query.toString()
    }, 'Destroying organization')
  },

  logDestroyed: (model, attrs, opts) => {
    model.log.info({
      method: opts.method,
      query: opts.query.toString()
    }, 'Destroyed organization')
  },

  addUser: Promise.method(function (user) {
    const log = logger.child({
      organizationGithubId: this.get(this.idAttribute),
      userGithubId: keypather.get(user, 'toJSON()'),
      method: 'Orgainization.addUser'
    })
    log.info('Organization.addUser called')
    if (!user) {
      // TODO: Change name of error
      throw new GithubEntityError('User does not exist')
    }
    return this.users().attach(user.get(user.idAttribute))
      .catch(Util.castDatabaseError)
      .tap(() => {
        log.trace('User added to organization')
      })
  }),

  removeUser: Promise.method(function (user) {
    const log = logger.child({
      organizationGithubId: this.get(this.idAttribute),
      method: 'Orgainization.removeUser'
    })
    log.info('Organization.removeUser called')
    if (!user) {
      // TODO: Change error
      throw new GithubEntityError('User does not exist')
    }
    return this.users().detach(user.get(user.idAttribute))
      .catch(Util.castDatabaseError)
      .tap(() => {
        log.trace('User removed from organization')
      })
  }),

  getAllUserIds: Promise.method(function () {
    const log = this.log.child({ id: this.get(this.idAttribute), method: 'Organization.getAllUserIds' })
    log.info('Organization.getAllUserIds called')
    return this.fetch({withRelated: ['users']})
      .then(models => models.toJSON().users)
      .map(o => o.id)
  })

}, {

  /**
   * Static methods
   */

  create: Promise.method(githubId => {
    const log = logger.child({ githubId: githubId, method: 'Orgainization.create' })
    log.info('Organization.create called')
    return new Organization()
      .save({
        // By default all newly created orgs should be inactive
        github_id: githubId,
        trial_end: moment().utc().toDate(),
        active_period_end: moment().utc().toDate(),
        grace_period_end: moment().utc().toDate()
      })
  }),

  fetchById: Promise.method(id => {
    const log = logger.child({ id: id, method: 'Orgainization.fetchById' })
    log.info('Organization.fetchById called')
    return new Organization({ id: id }).fetch()
  }),

  fetchByGithubId: Promise.method(function (githubId) {
    const log = logger.child({ githubId: githubId, method: 'Orgainization.fetchByGithubId' })
    log.info('Organization.fetchByGithubId called')
    return new Organization({ github_id: githubId }).fetch()
  })

})

module.exports = Organization
