'use strict'

/**
 * Database connection via knex query builder.
 * @module cream:models:user
 */

const db = require('./database')
const bookshelf = require('bookshelf')(db)

const User = bookshelf.Model.extend({
  tableName: 'user', // always use "quotes" to refer to this table
  hasTimestamps: true,
  idAttribute: 'github_id',
  organization: function () {
    return this.belongsToMany(Organization)
  }
})

const Organization = bookshelf.Model.extend({
  tableName: 'organization',
  hasTimestamps: true,
  idAttribute: 'github_id',
  user: function () {
    return this.belongsToMany(User)
  }
})

module.exports = {
  User: User,
  Organization: Organization
}
