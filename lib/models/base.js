'use strict'

const Promise = require('bluebird')

const bookshelf = require('models').bookshelf
const logger = require('util/logger')
const isString = require('101/is-string')

const DatabaseError = require('errors/database-error')
const NotNullError = require('errors/not-null-error')
const ForeignKeyError = require('errors/foreign-key-error')
const UniqueError = require('errors/unique-error')
const NoRowsDeletedError = require('errors/no-rows-deleted-error')
const NoRowsUpdatedError = require('errors/no-rows-updated-error')
const NotFoundError = require('errors/not-found-error')

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
    },

    getAllIdsForRelated: Promise.method(function (relName, opts) {
      const log = this.log.child({
        id: this.get(this.idAttribute),
        relName: relName,
        method: `${this.modelName}.getAllIdsForRelated`
      })
      log.info(`${this.modelName}.getAllIdsForRelated called`)
      opts = Object.assign({}, opts, { withRelated: [relName] })
      return this.fetch(opts)
        .then(models => models.toJSON()[relName])
        .map(o => o.id)
    })
  },

  staticMethods: {

    /**
     * Static Methods
     */

    /**
     * Fetches a model by its id
     *
     * @param {Number}     id   - Model id (Different from the github id)
     * @param {Object}     opts - Bookshelf query options. A transaction can be passed here
     * @return {Promise}
     * @resolves {Object}  Model - A Bookshelf model instance
     */
    fetchById: Promise.method(function (id, opts) {
      const Model = this
      const log = logger.child({ id: id, method: `${Model.modelName}.fetchById` })
      log.info(`${Model.modelName}.fetchById called`)
      opts = Object.assign({}, opts, { require: true })
      return new Model({ id: id }).fetch(opts)
        .catch(Model.castDatabaseError.bind(Model))
    }),

   /**
     * Fetches a model by its github id (`github_id`)
     *
     * @param {Number}     githubId   - Model githubId (Different `id`)
     * @param {Object}     opts - Bookshelf query options. A transaction can be passed here
     * @return {Promise}
     * @resolves {Object}  Model - A Bookshelf model instance
     */
    fetchByGithubId: Promise.method(function (githubId, opts) {
      const Model = this
      const log = logger.child({
        githubId: githubId,
        method: `${Model.modelName}.fetchByGithubId`,
        opts: opts
      })
      log.info(`${Model.modelName}.fetchByGithubId called`)
      opts = Object.assign({}, opts, { require: true })
      return new Model({ github_id: githubId }).fetch(opts)
        .catch(Model.castDatabaseError.bind(Model))
    }),

    /**
     * Casts a database error into an `error-cat` type error. This should be used
     * whenever a Bookshelf query is called in order to more easily deal with
     * errors in a `catch` promise chain.
     *
     * @param {Error}           err - An error from any Bookshelf query
     * @throws {DatabaseError}
     */
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

      // SQLSTATE error codes are defined as strings of length 5, if this is not
      // the case we cannot determine a specific database error to handle and
      // should simply rethrow the error.
      //
      // see: http://www.contrib.andrew.cmu.edu/~shadow/sql/sql1992.txt
      //
      if (!isString(err.code) || err.code.length !== 5) {
        throw err
      }
      switch (err.code) {
        case '23502':
          throw (new NotNullError(err))
        case '23503':
          throw (new ForeignKeyError(err))
        case '23505':
          throw (new UniqueError(err))
      }
      throw (new DatabaseError(err))
    }
  }

}
