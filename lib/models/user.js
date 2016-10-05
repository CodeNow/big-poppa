'use strict'

const Promise = require('bluebird')
const BaseModel = require('models/base')
const GithubAPI = require('util/github')
const NotFoundError = require('errors/not-found-error')

const User = BaseModel.extend('User', {

  /**
   * Main properties
   */

  tableName: 'users',
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
   * the `githubId` is an actual Github organization
   *
   * @param {Organization}  model           - User model instance
   * @param {Object}        attrs           - Attributes for Organization model instance
   * @param {Number}        attrs.githubId - User github id
   * @resolves {Object}     githubOrg       - Github user object
   * @return {Promise}
   */
  validateCreate: function (model, attrs) {
    const log = this.log.child({ attrs: attrs, method: 'User.validateCreate' })
    log.info('User.validateCreate called')
    const githubApi = new GithubAPI()
    return githubApi.getUser(attrs.githubId)
      .tap(user => {
        log.trace({ user: user }, 'User fetched from Github')
      })
  }
}, {

  /**
   * Static Methods
   */

  /**
   * Update or create a user by it's github ID
   * @param {Number} githubId - Github ID
   * @param {String} accessToken - Github Access Token
   * @resolves {User}
   * @returns {Promise}
   */
  updateOrCreateByGithubId: function (githubId, accessToken) {
    let updates = null
    return User.fetchByGithubId(githubId)
      .then((user) => {
        user.on('saving', (model, attrs) => {
          updates = attrs
        })
        return user.save({
          accessToken: accessToken
        }, { patch: true })
      })
      .catch(NotFoundError, () => {
        return new User()
          .save({
            githubId: githubId,
            accessToken: accessToken
          })
      })
      .then(() => Promise.props({
        model: User.fetchByGithubId(githubId, { withRelated: 'organizations' }),
        updates: updates
      }))
  }
})

module.exports = User
