'use strict'

var debug = require('debug')('big-poppa:migration')

/**
 * Make the `gracePeriodEnd` value nullable
 */

const tableName = 'organizations'
const triggerName = 'update_grace_period_column'
const activePeriodEndColumnName = 'active_period_end'
const gracePeriodEndColumnName = 'grace_period_end'
const trialEndColumnName = 'trial_end'
const GRACE_PERIOD_DURATION_IN_HOURS = 72

const UPDATE_GRACE_PERIOD_TRIGGER = `
  CREATE OR REPLACE FUNCTION ${triggerName}()
  RETURNS TRIGGER AS $$
  BEGIN
    IF OLD.${activePeriodEndColumnName}!= NEW.${activePeriodEndColumnName} THEN
      NEW.${gracePeriodEndColumnName} = NEW.${activePeriodEndColumnName} + interval '${GRACE_PERIOD_DURATION_IN_HOURS}h';
    END IF;

    IF OLD.${trialEndColumnName} != NEW.${trialEndColumnName} THEN
      NEW.${gracePeriodEndColumnName} = NEW.${trialEndColumnName} + interval '${GRACE_PERIOD_DURATION_IN_HOURS}h';
    END IF;

    RETURN NEW;
  END;
  $$ language 'plpgsql';
`
const CREATE_TRIGGER = `
  CREATE TRIGGER ${triggerName} BEFORE UPDATE
    ON ${tableName} FOR EACH ROW EXECUTE PROCEDURE
    ${triggerName}();
`

const DELETE_TRIGGER = `
  DROP TRIGGER ${triggerName} ON ${tableName};
`

exports.up = function (knex, Promise) {
  var modifyTable = Promise.resolve()
    .then(function () {
      return knex.schema
        .raw(UPDATE_GRACE_PERIOD_TRIGGER)
        .raw(CREATE_TRIGGER)
    })
  debug(modifyTable.toString())
  return modifyTable
}

exports.down = function (knex, Promise) {
  var modifyTable = Promise.resolve()
    .then(function () {
      return knex.schema
        .raw(DELETE_TRIGGER)
    })
  debug(modifyTable.toString())
  return modifyTable
}
