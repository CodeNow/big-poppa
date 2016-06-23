'use strict'

/**
 * Database connection via knex query builder.
 * @module cream:models:user
 */

const db = require('../database')
const bookshelf = require('bookshelf')(db)

const User = bookshelf.Model.extend({
  tableName: 'users',
  organization: function () {
    return this.belongsToMany(Organization)
  }
})

const Organization = bookshelf.Model.extend({
  tableName: 'organization',
  user: function () {
    return this.belongsToMany(User)
  }
})

module.exports = {
  User: User,
  Organization: Organization
}
