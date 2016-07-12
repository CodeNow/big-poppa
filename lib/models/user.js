'use strict'

const BaseModel = require('models/base')
const GithubAPI = require('util/github')

const User = BaseModel.extend('User', {

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

  /**
   * Method used by bookshelf to initialize model instances
   * @return {void}
   */
  initialize: function () {
    BaseModel.prototypeMethods.initialize.apply(this, arguments)
    this.on('creating', this.validateCreate)
  },

  /**
   * Validates the creation of a `User` model instance by asserting
   * the `github_id` is an actual Github organization
   *
   * @param {Organization}  model           - User model instance
   * @param {Object}        attrs           - Attributes for Organization model instance
   * @param {Number}        attrs.github_id - User github id
   * @resolves {Object}     githubOrg       - Github user object
   * @return {Promise}
   */
  validateCreate: function (model, attrs) {
    const log = this.log.child({ attrs: attrs, method: 'User.validateCreate' })
    log.info('User.validateCreate called')
    return GithubAPI.getUser(attrs.github_id)
      .tap(user => {
        log.trace({ user: user }, 'User fetched from Github')
      })
  }

}, {

  /**
   * Static Methods
   */

})

module.exports = User
