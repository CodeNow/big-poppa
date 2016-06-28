'use strict'

const Promise = require('bluebird')

const bookshelf = require('./').bookshelf
const logger = require('../logger').create('models', {}).child({ module: 'models/organization' })
const Util = require('../util')
const GithubAPI = require('../github')

const GithubEntityError = require('../errors/github-entity-error')
const NoRowsDeletedError = require('../errors/no-rows-deleted-error')

const User = bookshelf.model('User', {

  /**
   * Main properties
   */

  tableName: 'user', // always use "quotes" to refer to this table
  hasTimestamps: true,
  idAttribute: 'github_id',
  organizations: function () {
    return this.belongsToMany('Organization')
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
    this.log = logger.child({ model: 'User' })
  },

  validateCreate: Promise.method(function (model, attrs) {
    const log = this.log.child({ attrs: attrs, method: 'User.validateCreate' })
    log.info('User.validateCreate called')
    return GithubAPI.getUser(attrs.github_id)
      .then(user => {
        if (!user) {
          throw new GithubEntityError('Provided github ID is not a github user.')
        }
        log.trace({ user: user }, 'User fetched from Github')
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
      .catch(User.NoRowsDeletedError, err => {
        throw new NoRowsDeletedError(err)
      })
  }),

  logSaving: function (model, attrs, opts) {
    model.log.info({
      attrs: attrs,
      method: opts.method,
      query: opts.query.toString()
    }, 'Saving user')
  },

  logSaved: function (model, attrs, opts) {
    model.log.info({
      attrs: attrs,
      method: opts.method,
      query: opts.query.toString()
    }, 'Saved user')
  },

  logDestroying: function (model, opts) {
    model.log.info({
      method: opts.method,
      query: opts.query.toString()
    }, 'Destroying user')
  },

  logDestroyed: function (model, attrs, opts) {
    model.log.info({
      method: opts.method,
      query: opts.query.toString()
    }, 'Destroyed user')
  },

  getAllUserOrgsIds: Promise.method(function (model, attrs, opts) {
    const log = this.log.child({ githubId: this.get('github_id'), method: 'User.getAllUserOrgs' })
    log.info('User.getAllUserOrgs called')
    return this.fetch({withRelated: ['organizations']})
      .then(models => models.toJSON().organizations)
      .map(o => o.github_id)
  })

}, {

  /**
   * Static Methods
   */

  fetchByGithubId: Promise.method(function (githubId) {
    const log = logger.child({ githubId: githubId, method: 'User.fetchByGithubId' })
    log.info('User.fetchByGithubId called')
    return new User({ github_id: githubId }).fetch()
  })

})

module.exports = User
