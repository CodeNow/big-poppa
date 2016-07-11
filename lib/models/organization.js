'use strict'

const Promise = require('bluebird')
const moment = require('moment')
const keypather = require('keypather')()

const bookshelf = require('models').bookshelf
const BaseModel = require('models/base')

const logger = require('util/logger').child({ module: 'models/organization' })
const GithubAPI = require('util/github')

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

  /**
   * Method used by bookshelf to initialize model instances
   * @return {void}
   */
  initialize: function () {
    BaseModel.prototypeMethods.initialize.apply(this, arguments)
    this.on('creating', this.validateCreate)
  },

  /**
   * Validates the creation of an `Organization` model instance by asserting
   * the `github_id` is an actual Github organization
   *
   * @param {Organization}  model           - Organization model instance
   * @param {Object}        attrs           - Attributes for Organization model instance
   * @param {Number}        attrs.github_id - Organization github id
   * @resolves {Object}     githubOrg       - Github organization object
   * @return {Promise}
   */
  validateCreate: function (model, attrs) {
    const log = this.log.child({ method: 'Organization.validateCreate' })
    log.info('Organization.validateSave called')
    return GithubAPI.getOrganization(attrs.github_id)
      .tap(org => {
        log.trace({ org: org }, 'Organization fetched from Github')
      })
  },

  /**
   * Adds a user to an organization. Throws an error if the user has already
   * been added to the organization.
   *
   * @param {User}      user             - User model instance
   * @param {String}    user.modelName   - Name of model. Populated by base model
   * @param {String}    user.idAttribute - id attribute for model. Specified by `User` model
   * @param {Function}  user.get         - Methods for getting model property
   * @param {Object}    opts             - Bookshelf query options. A transaction can be passed here
   * @resolves {User}   user             - User model instance
   * @return {Promise}
   */
  addUser: Promise.method(function (user, opts) {
    const log = logger.child({
      organizationGithubId: this.get(this.idAttribute),
      userGithubId: keypather.get(user, 'toJSON()'),
      opts: opts,
      method: 'Orgainization.addUser'
    })
    log.info('Organization.addUser called')
    if (!(user instanceof bookshelf.Model) || user.modelName !== 'User') {
      throw new TypeError('Firt argument must be a `User` model instance')
    }
    return this.users().attach(user.get(user.idAttribute), opts)
      .catch(Organization.castDatabaseError.bind(Organization))
      .tap(() => {
        log.trace('User added to organization')
      })
  }),

  /**
   * Removes a user from an organization. Throws an error if the user is not
   * already in the organization.
   *
   * @param {User}      user             - User model instance
   * @param {String}    user.modelName   - Name of model. Populated by base model
   * @param {String}    user.idAttribute - id attribute for model. Specified by `User` model
   * @param {Function}  user.get         - Methods for getting model property
   * @param {Object}    opts             - Bookshelf query options. A transaction can be passed here
   * @resolves {void}                    - Undefined
   * @return {Promise}
   */
  removeUser: Promise.method(function (user, opts) {
    const log = logger.child({
      organizationGithubId: this.get(this.idAttribute),
      opts: opts,
      method: 'Orgainization.removeUser'
    })
    log.info('Organization.removeUser called')
    if (!(user instanceof bookshelf.Model) || user.modelName !== 'User') {
      throw new TypeError('Firt argument must be a `User` model instance')
    }
    return this.users().detach(user.get(user.idAttribute), opts)
      .catch(Organization.castDatabaseError.bind(Organization))
      .tap(() => {
        log.trace('User removed from organization')
      })
  })

}, {

  /**
   * Static methods
   */

  /**
   * Create a new `Organization` model instance
   *
   * @param {String}           githubId     - Github ID for new organization
   * @param {Object}           opts         - Bookshelf query options. A transaction can be passed here
   * @resolves {Organization}  organization - Organization model instance
   * @return {Promise}
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
