'use strict'

const express = require('express');
const router = express.Router();

router.get('/:id', (req, res) => {
  return res.json({ hello: 'world' })
})

router.patch('/:id', (req, res) => {
  return res.json({ hello: 'world' })
})

module.exports = router

