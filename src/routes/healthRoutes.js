import { Router } from 'express';
import * as healthController from '../controllers/healthController.js';

const router = Router();

/** @route  GET /api/v1/health       — detailed health check */
router.get('/', healthController.healthCheck);

/** @route  GET /api/v1/health/ping  — ultra-light liveness probe */
router.get('/ping', healthController.ping);

export default router;
