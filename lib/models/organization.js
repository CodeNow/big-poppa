'use strict'

const Promise = require('bluebird')
const moment = require('moment')
const keypather = require('keypather')()

const bookshelf = require('models').bookshelf
const BaseModel = require('models/base')

const logger = require('util/logger').child({ module: 'models/organization' })
const GithubAPI = require('util/github')
const rabbitMQ = require('util/rabbitmq')

const GithubEntityTypeError = require('errors/github-entity-type-error')
const ValidationError = require('errors/validation-error')

const Organization = BaseModel.extend('Organization', {

  /**
   * Main model properties
   */

  tableName: 'organizations',
  hasTimestamps: true,
  idAttribute: 'id',
  users: function () {
    return this.belongsToMany('User')
  },
  creator: function () {
    return this.belongsTo('User', 'creator')
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
    const githubApi = new GithubAPI()
    return githubApi.getOrganization(attrs.githubId)
      .tap(org => {
        model.set({ name: org.login })
        log.trace({ org }, 'Organization fetched from Github')
      })
      .catch(GithubEntityTypeError, err => {
        log.trace({ err }, 'Organization not found in Github. Checking githubId belong to a user.')
        return githubApi.getUser(attrs.githubId)
        .then(user => {
          model.set({ name: user.login, isPersonalAccount: true })
          log.trace({ user }, 'User model fetched from Github (to create organization)')
        })
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
      user: keypather.get(user, 'toJSON()'),
      opts: opts,
      method: 'Orgainization.addUser'
    })
    log.info('Organization.addUser called')
    if (!(user instanceof bookshelf.Model) || user.modelName !== 'User') {
      log.warn('First argument must be a `User` model instance')
      throw new TypeError('First argument must be a `User` model instance')
    }
    return Promise.try(() => {
      if (this.get('isPersonalAccount')) {
        log.trace({ orgGithubId: this.get('githubId') }, 'Organization is a personal account. Checking if same user.')
        if (this.get('githubId') === user.get('githubId')) {
          return true
        }
        throw new ValidationError('Only github user allowed in personal accounts')
      }
      const githubApi = new GithubAPI(user.get('accessToken'))
      /**
       * Currently all names are mapped to the GH organization username. If this
       * ever changes, this call has to change in order to fetch the organization
       * username by its Github ID
       */
      log.trace({ lowerName: this.get('lowerName') }, 'Check if user belongs to github organization')
      return githubApi.hasUserOrgMembership(this.get('lowerName'))
    })
    .tap(() => {
      log.trace('Adding user to organization')
      return this.users().attach(user.get(user.idAttribute), opts)
      .catch(Organization.castDatabaseError.bind(Organization))
    })
    .tap(() => {
      log.trace('User added to organization')
      return rabbitMQ.publishEvent('organization.user.added', {
        organization: {
          id: this.get(this.idAttribute),
          githubId: this.get('githubId')
        },
        user: {
          id: user.get(user.idAttribute),
          githubId: user.get('githubId')
        }
      })
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
   * @param {String}            githubId     - Github ID for new organization
   * @param {User}              creator      - User who created this organization (User model instance)
   * @param {Object}            opts         - Bookshelf query options. A transaction can be passed here
   * @resolves {Organization}   organization - Organization model instance
   * @return {Promise}
   */
  create: Promise.method((githubId, creator, opts) => {
    const creatorUserId = creator.get(creator.idAttribute)
    const log = logger.child({ githubId, creatorUserId })
    log.info('Organization.create called')
    const thirtyDaysFromToday = moment().add(30, 'days').utc().toDate()
    return new Organization()
      .save({
        // By default all newly created orgs should be inactive
        githubId: githubId,
        trialEnd: thirtyDaysFromToday,
        activePeriodEnd: moment().utc().toDate(),
        creator: creatorUserId,
        metadata: {
          hasAha: true
        },
        /**
         * Grace periods are updated automatically through a trigger in the DB
         * These are set to 72 hours after either the trial end or grace period end
         * when either of these are updated
         *
         * They do need to be set initially. If set to now, orgs are, by default
         * set to be completely inactive.
         */
        gracePeriodEnd: moment().utc().toDate()
      }, opts)
  }),

  withRelatedProps: ['creator', 'users']
})

module.exports = Organization
