'use strict'

const Promise = require('bluebird')

const bookshelf = require('common/models').bookshelf
const logger = require('common/logger').create('models', {})
const Util = require('common/util')

const NoRowsDeletedError = require('common/errors/no-rows-deleted-error')
const NoRowsUpdatedError = require('common/errors/no-rows-updated-error')
const NotFoundError = require('common/errors/not-found-error')

module.exports = {

  extend: function (modelName, prototypePropertiesAndMethods, staticMethods) {
    prototypePropertiesAndMethods = prototypePropertiesAndMethods || {}
    staticMethods = staticMethods || {}

    // Add model name to make logging more clear
    prototypePropertiesAndMethods.modelName = modelName
    staticMethods.modelName = modelName

    return bookshelf.model(
      modelName,
      Object.assign({}, this.prototypeMethods, prototypePropertiesAndMethods),
      Object.assign({}, this.staticMethods, staticMethods)
    )
  },

  /**
   * Prototype Methods
   */

  prototypeMethods: {
    initialize: function () {
      // Logs
      this.on('saving', this.logSaving)
      this.on('saved', this.logSaved)
      this.on('destroying', this.logDestroying)
      this.on('destroyed', this.logDestroyed)
      this.log = logger.child({ model: this.constructor.modelName })
    },

    // Ovewrite `save` method
    save: Promise.method(function () {
      return bookshelf.Model.prototype.save.apply(this, arguments)
        .catch(this.constructor.castDatabaseError.bind(this.constructor))
    }),

    destroy: Promise.method(function () {
      return bookshelf.Model.prototype.destroy.apply(this, arguments)
        .catch(this.constructor.castDatabaseError.bind(this.constructor))
    }),

    logSaving: (model, attrs, opts) => {
      model.log.info({
        attrs: attrs,
        method: opts.method,
        query: opts.query.toString()
      }, `Saving ${model.modelName}`)
    },

    logSaved: (model, attrs, opts) => {
      model.log.info({
        attrs: attrs,
        method: opts.method,
        query: opts.query.toString()
      }, `Saved ${model.modelName}`)
    },

    logDestroying: (model, opts) => {
      model.log.info({
        method: opts.method,
        query: opts.query.toString()
      }, `Destroying ${model.modelName}`)
    },

    logDestroyed: (model, attrs, opts) => {
      model.log.info({
        method: opts.method,
        query: opts.query.toString()
      }, `Destroyed ${model.modelName}`)
    }
  },

  staticMethods: {

    /**
     * Static Methods
     */

    fetchById: Promise.method(function (id, opts) {
      const Model = this
      const log = logger.child({ id: id, method: `${Model.modelName}.fetchById` })
      log.info(`${Model.modelName}.fetchById called`)
      opts = Object.assign({}, opts, { require: true })
      return new Model({ id: id }).fetch(opts)
        .catch(Model.castDatabaseError.bind(Model))
    }),

    fetchByGithubId: Promise.method(function (githubId, opts) {
      const Model = this
      const log = logger.child({ githubId: githubId, method: `${Model.modelName}.fetchById` })
      log.info(`${Model.modelName}.fetchByGithubId called`)
      opts = Object.assign({}, opts, { require: true })
      return new Model({ github_id: githubId }).fetch(opts)
        .catch(Model.castDatabaseError.bind(Model))
    }),

    castDatabaseError: function (err) {
      const Model = this
      if (err instanceof Model.NotFoundError) {
        throw new NotFoundError(`No instances of '${Model.modelName}' found in database`, { err: err })
      }
      if (err instanceof Model.NoRowsUpdatedError) {
        throw new NoRowsUpdatedError(`No instances of '${Model.modelName}' updated in database`, { err: err })
      }
      if (err instanceof Model.NoRowsDeletedError) {
        throw new NoRowsDeletedError(`No instances of '${Model.modelName}' deleted from database`, { err: err })
      }
      Util.castDatabaseError(err)
    }
  }

}
