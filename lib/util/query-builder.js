'use strict'

const _ = require('lodash')
const logger = require('util/logger').child({ module: 'util/query-builder' })

module.exports = class QueryBuilder {

  /**
   * Generate a query from a JS object
   *
   * @param {Object} query - Object with key/value pairs for database query
   * @param {Object} queryBuilder - Knex query builder passed by `.query`
   * @return {Void}
   */
  static generate (query, queryBuilder) {
    const log = logger.child({ query })
    const keyPattern = /^([A-z]*)\.([A-z]*)/
    Object.keys(query).forEach(key => {
      const matches = key.match(keyPattern)
      let specialQueryKey
      let dbPropertyName
      if (matches === null) {
        dbPropertyName = key
      } else {
        dbPropertyName = matches[1]
        specialQueryKey = matches[2]
      }
      let snakeCaseKey = _.snakeCase(dbPropertyName)
      switch (specialQueryKey) {
        case 'isNull':
          if (query[key]) {
            queryBuilder.whereNull(snakeCaseKey)
          } else {
            queryBuilder.whereNotNull(snakeCaseKey)
          }
          break
        case 'moreThan':
          queryBuilder.where(snakeCaseKey, '>', query[key])
          break
        case 'lessThan':
          queryBuilder.where(snakeCaseKey, '<', query[key])
          break
        default:
          queryBuilder.where(snakeCaseKey, query[key])
      }
    })
    log.trace({ finalQuery: queryBuilder.toString() }, 'Finished building query')
  }
}

