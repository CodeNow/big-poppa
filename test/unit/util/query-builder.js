'use strict'

const sinon = require('sinon')
const expect = require('chai').expect

const moment = require('moment')
const QueryBuilder = require('util/query-builder')

describe('QueryBuilder', () => {
  describe('#generate', () => {
    let queryBuilderStub

    beforeEach('Stub out methods', () => {
      queryBuilderStub = {
        where: sinon.stub().returnsThis(),
        whereNull: sinon.stub().returnsThis(),
        whereNotNull: sinon.stub().returnsThis()
      }
    })

    it('should add `where` statement for regular keys', () => {
      QueryBuilder.generate({ hello: 'world' }, queryBuilderStub)
      sinon.assert.calledOnce(queryBuilderStub.where)
      sinon.assert.calledWithExactly(
        queryBuilderStub.where,
        'hello', 'world'
      )
    })

    it('should add `>` statement for `moreThan`', () => {
      const time = moment().toISOString()
      const jsonString = JSON.stringify({ moreThan: time })
      QueryBuilder.generate({ hello: jsonString }, queryBuilderStub)
      sinon.assert.calledOnce(queryBuilderStub.where)
      sinon.assert.calledWithExactly(
        queryBuilderStub.where,
        'hello', '>', time
      )
    })

    it('should add `<` statement for `lessThan`', () => {
      const time = moment().toISOString()
      const jsonString = JSON.stringify({ lessThan: time })
      QueryBuilder.generate({ hello: jsonString }, queryBuilderStub)
      sinon.assert.calledOnce(queryBuilderStub.where)
      sinon.assert.calledWithExactly(
        queryBuilderStub.where,
        'hello', '<', time
      )
    })

    it('should add `whereNotNull` statement for `isNull: false`', () => {
      const jsonString = JSON.stringify({ isNull: false })
      QueryBuilder.generate({ hello: jsonString }, queryBuilderStub)
      sinon.assert.calledOnce(queryBuilderStub.whereNotNull)
      sinon.assert.calledWithExactly(
        queryBuilderStub.whereNotNull,
        'hello'
      )
    })

    it('should add `whereNull` statement for `isNull: true`', () => {
      const jsonString = JSON.stringify({ isNull: true })
      QueryBuilder.generate({ hello: jsonString }, queryBuilderStub)
      sinon.assert.calledOnce(queryBuilderStub.whereNull)
      sinon.assert.calledWithExactly(
        queryBuilderStub.whereNull,
        'hello'
      )
    })

    it('should handle `null`', () => {
      const jsonString = JSON.stringify(null)
      QueryBuilder.generate({ hello: jsonString }, queryBuilderStub)
      sinon.assert.calledOnce(queryBuilderStub.where)
      sinon.assert.calledWithExactly(
        queryBuilderStub.where,
        'hello', 'null'
      )
    })

    it('should handle `null`', () => {
      QueryBuilder.generate({ hello: null }, queryBuilderStub)
      sinon.assert.calledOnce(queryBuilderStub.where)
      sinon.assert.calledWithExactly(
        queryBuilderStub.where,
        'hello', null
      )
    })

    describe('Multiple keys', () => {
      it('should call `where` multiple times if there are multiple keys', () => {
        QueryBuilder.generate({
          'super': 'hello1',
          'mega': 'hello2',
          'totally': 'hello3',
          'jorge': 'hello4'
        }, queryBuilderStub)
        sinon.assert.called(queryBuilderStub.where)
        expect(queryBuilderStub.where.callCount).to.equal(4)
        sinon.assert.calledWithExactly(
          queryBuilderStub.where,
          'super', 'hello1'
        )
        sinon.assert.calledWithExactly(
          queryBuilderStub.where,
          'mega', 'hello2'
        )
        sinon.assert.calledWithExactly(
          queryBuilderStub.where,
          'totally', 'hello3'
        )
        sinon.assert.calledWithExactly(
          queryBuilderStub.where,
          'jorge', 'hello4'
        )
      })

      it('should call `where`, `whereNull`, `whereNotNull`, `>`, and `<` if they are all called together', () => {
        QueryBuilder.generate({
          'super': 'hello1',
          mega: JSON.stringify({ isNull: true }),
          totally: JSON.stringify({ isNull: false }),
          jorge: JSON.stringify({ lessThan: 7 }),
          raul: JSON.stringify({ moreThan: 3 })
        }, queryBuilderStub)
        expect(queryBuilderStub.where.callCount).to.equal(3)
        sinon.assert.calledOnce(queryBuilderStub.whereNotNull)
        sinon.assert.calledOnce(queryBuilderStub.whereNull)
        sinon.assert.calledWithExactly(
          queryBuilderStub.where,
          'super', 'hello1'
        )
        sinon.assert.calledWithExactly(
          queryBuilderStub.whereNull,
          'mega'
        )
        sinon.assert.calledWithExactly(
          queryBuilderStub.whereNotNull,
          'totally'
        )
        sinon.assert.calledWithExactly(
          queryBuilderStub.where,
          'jorge', '<', 7
        )
        sinon.assert.calledWithExactly(
          queryBuilderStub.where,
          'raul', '>', 3
        )
      })
    })
  })
})
