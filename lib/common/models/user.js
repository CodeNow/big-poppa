'use strict'

const Promise = require('bluebird')

const BaseModel = require('common/models/base')
const GithubAPI = require('common/github')

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

  initialize: function () {
    BaseModel.prototypeMethods.initialize.apply(this, arguments)
    this.on('creating', this.validateCreate)
  },

  validateCreate: Promise.method(function (model, attrs) {
    const log = this.log.child({ attrs: attrs, method: 'User.validateCreate' })
    log.info('User.validateCreate called')
    return GithubAPI.getUser(attrs.github_id)
      .tap(user => {
        log.trace({ user: user }, 'User fetched from Github')
      })
  }),

  getAllUserOrgsIds: Promise.method(function (opts) {
    const log = this.log.child({ id: this.get(this.idAttribute), method: 'User.getAllUserOrgs' })
    log.info('User.getAllUserOrgs called')
    opts = Object.assign({}, opts, { withRelated: ['organizations'] })
    return this.fetch(opts)
      .then(model => model.toJSON().organizations)
      .map(o => o.id)
  })

}, {

  /**
   * Static Methods
   */

})

module.exports = User
