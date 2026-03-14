'use strict';

const router = require('express').Router();

const authRoutes = require('./authRoutes');
const taskRoutes = require('./taskRoutes');
const healthRoutes = require('./healthRoutes');

router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/health', healthRoutes);

module.exports = router;
