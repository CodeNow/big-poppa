'use strict'

const Promise = require('bluebird')

const bookshelf = require('common/models').bookshelf
const logger = require('common/logger').create('models', {}).child({ module: 'models/organization' })
const Util = require('common/util')
const GithubAPI = require('common/github')

const GithubEntityError = require('common/errors/github-entity-error')
const NoRowsDeletedError = require('common/errors/no-rows-deleted-error')
const NoRowsUpdatedError = require('common/errors/no-rows-updated-error')
const NotFoundError = require('common/errors/not-found-error')

const User = bookshelf.model('User', {

  /**
   * Main properties
   */

  tableName: 'user', // always use "quotes" to refer to this table
  hasTimestamps: true,
  idAttribute: 'id',
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
      .catch(User.NoRowsDeletedError, err => {
        throw new NoRowsDeletedError(`No user destroyed: ${err.toString()}`, { err: err })
      })
      .catch(Util.castDatabaseError)
  }),

  logSaving: (model, attrs, opts) => {
    model.log.info({
      attrs: attrs,
      method: opts.method,
      query: opts.query.toString()
    }, 'Saving user')
  },

  logSaved: (model, attrs, opts) => {
    model.log.info({
      attrs: attrs,
      method: opts.method,
      query: opts.query.toString()
    }, 'Saved user')
  },

  logDestroying: (model, opts) => {
    model.log.info({
      method: opts.method,
      query: opts.query.toString()
    }, 'Destroying user')
  },

  logDestroyed: (model, attrs, opts) => {
    model.log.info({
      method: opts.method,
      query: opts.query.toString()
    }, 'Destroyed user')
  },

  getAllUserOrgsIds: Promise.method(function (model, attrs, opts) {
    const log = this.log.child({ id: this.get(this.idAttribute), method: 'User.getAllUserOrgs' })
    log.info('User.getAllUserOrgs called')
    return this.fetch({withRelated: ['organizations']})
      .then(models => models.toJSON().organizations)
      .map(o => o.id)
  })

}, {

  /**
   * Static Methods
   */

  fetchById: Promise.method(id => {
    const log = logger.child({ id: id, method: 'User.fetchById' })
    log.info('User.fetchById called')
    return new User({ id: id }).fetch({ require: true })
      .catch(Util.castDatabaseError)
  }),

  fetchByGithubId: Promise.method(githubId => {
    const log = logger.child({ githubId: githubId, method: 'User.fetchByGithubId' })
    log.info('User.fetchByGithubId called')
    return new User({ github_id: githubId }).fetch({ require: true })
      .catch(User.castDBError)
  }),

  castDBError: function (err) {
    if (err instanceof this.constructor.NotFoundError) {
      throw new NotFoundError(`No instances of '${this.tableName}' found in database`, { err: err })
    }
    if (err instanceof this.contstructor.NoRowsUpdatedError) {
      throw new NoRowsUpdatedError(`No instances of '${this.tableName}' updated in database`, { err: err })
    }
    if (err instanceof this.constructor.NoRowsDeletedError) {
      throw new NoRowsDeletedError(`No instances of '${this.tableName}' deleted from database`, { err: err })
    }
    Util.castDatabaseError(err)
  }

})

module.exports = User
