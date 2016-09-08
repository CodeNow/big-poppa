'use strict'

const _ = require('lodash')
const isObject = require('101/is-object')

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
    Object.keys(query).forEach(key => {
      let value = query[key]
      let snakeCaseKey = _.snakeCase(key)
      let subQuery = QueryBuilder.getSubQuery(value)
      if (subQuery) {
        Object.keys(subQuery).forEach(subKey => {
          const subValue = subQuery[subKey]
          switch (subKey) {
            case 'isNull':
              if (subValue) {
                queryBuilder.whereNull(snakeCaseKey)
              } else {
                queryBuilder.whereNotNull(snakeCaseKey)
              }
              break
            case 'moreThan':
              queryBuilder.where(snakeCaseKey, '>', subValue)
              break
            case 'lessThan':
              queryBuilder.where(snakeCaseKey, '<', subValue)
              break
          }
        })
      } else {
        queryBuilder.where(snakeCaseKey, value)
      }
    })
    log.trace({ finalQuery: queryBuilder.toString() }, 'Finished building query')
  }

  /**
   * Get/check sub query
   *
   * @param {String} valueString - JSON string of sub query
   * @returns {Object|Null} - Sub-query or null if it's not a sub query
   */
  static getSubQuery (valueString) {
    let newValue
    try {
      newValue = JSON.parse(valueString)
      if (isObject(newValue)) {
        return newValue
      }
    } catch (err) {}
    return null
  }
}

