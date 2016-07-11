'use strict'

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))
const express = require('express');
const router = express.Router();

router.get('/:id', (rawRequest, res) => {

  const schema = Joi.object({
    params: Joi.object({
      id: Joi.number().required()
    }).unknown().required()
  }).unknown()

  console.log(rawRequest.params)

  return Joi.validateAsync(schema,{
    params: rawRequest.params
  })
    .then(req => {
      return res.json({ req: req })
    })
    .catch(err => {
      return res.json({ err: err })
    })
})

router.patch('/:id', (req, res) => {
  return res.json({ hello: 'world' })
})

module.exports = router

