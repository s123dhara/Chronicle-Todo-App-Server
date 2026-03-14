'use strict';

const router = require('express').Router();
const healthController = require('../controllers/healthController');

/** @route  GET /api/v1/health       — detailed health check */
router.get('/', healthController.healthCheck);

/** @route  GET /api/v1/health/ping  — ultra-light liveness probe */
router.get('/ping', healthController.ping);

module.exports = router;
