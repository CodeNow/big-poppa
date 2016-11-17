'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))
const expect = require('chai').expect
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const rabbitMQ = require('util/rabbitmq')
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const PublishDailyTasksWorker = require('workers/time.one-day.passed').task
const PublishDailyTasksSchema = require('workers/time.one-day.passed').jobSchema

describe('#time.one-day.passed', () => {
  let validJob
  let rabbitMQStub

  beforeEach(() => {
    validJob = {}
    rabbitMQStub = sinon.stub(rabbitMQ.prototype, 'publishTask').resolves()
  })

  afterEach(() => {
    rabbitMQStub.restore()
  })

  describe('Validation', () => {
    it('should validate if a valid job is passed', () =>
      Joi.validateAsync(validJob, PublishDailyTasksSchema))
  })

  describe('Errors', () => {
    it('should throw `WorkerStopError` if `rabbitMQ.publishTask` does not resolve', done => {
      rabbitMQStub.rejects()

      PublishDailyTasksWorker(validJob)
        .asCallback(err => {
          expect(err).to.exist
          expect(err).to.be.an.instanceof(WorkerStopError)
          done()
        })
    })
  })

  describe('Main Functionality', () => {
    it('should publish a task using rabbitMQ', () => {
      return PublishDailyTasksWorker(validJob)
        .then(() => {
          sinon.assert.calledOnce(rabbitMQStub)
          sinon.assert.calledWith(
            'organization.cleanup',
            {}
          )
        })
    })
  })
})
