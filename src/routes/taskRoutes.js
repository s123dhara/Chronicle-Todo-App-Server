'use strict';

const router = require('express').Router();

const taskController = require('../controllers/taskController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { mutationLimiter } = require('../middleware/rateLimiter');
const { param, query } = require('express-validator');
const {
  createTaskValidator,
  updateTaskValidator,
  completeTaskValidator,
  completeDelayedValidator,
  listTasksValidator,
  deleteTaskValidator,
  getTaskValidator,
} = require('../validators/taskValidators');

// All task routes require authentication
router.use(protect);

// ── Special / aggregate routes (MUST come before /:id routes) ─────────────────

/** @route  GET /api/v1/tasks/dashboard
 *  @desc   Home page data: today stats, current task, next task, delayed list
 *  @access Private
 */
router.get('/dashboard', taskController.getDashboard);

/** @route  GET /api/v1/tasks/calendar?year=2024&month=6
 *  @desc   Month view — per-day task count summary
 *  @access Private
 */
router.get('/calendar', taskController.getCalendar);

/** @route  GET /api/v1/tasks/by-date/:date
 *  @desc   All tasks for a specific date (YYYY-MM-DD)
 *  @access Private
 */
router.get(
  '/by-date/:date',
  [
    param('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('date must be YYYY-MM-DD'),
    validate,
  ],
  taskController.getTasksByDate
);

/** @route  PATCH /api/v1/tasks/sync-delayed
 *  @desc   Trigger delayed-status sync for the current user
 *  @access Private
 */
router.patch('/sync-delayed', taskController.syncDelayed);

/** @route  GET /api/v1/tasks/sync-delayed
 *  @desc   Trigger delayed-status sync for the all user
 *  @access Private
 */
router.get('/sync-all-delayed', taskController.syncAllDelayed);

// ── Collection routes ─────────────────────────────────────────────────────────

/** @route  GET /api/v1/tasks
 *  @desc   List tasks — supports ?date, ?status, ?priority, ?category, ?page, ?limit, ?sortBy, ?order
 *  @access Private
 */
router.get('/', listTasksValidator, validate, taskController.listTasks);

/** @route  POST /api/v1/tasks
 *  @desc   Create a new task
 *  @access Private
 */
router.post('/', mutationLimiter, createTaskValidator, validate, taskController.createTask);

// ── Single-resource routes ────────────────────────────────────────────────────

/** @route  GET /api/v1/tasks/:id
 *  @desc   Get single task by ID
 *  @access Private
 */
router.get('/:id', getTaskValidator, validate, taskController.getTask);

/** @route  PUT /api/v1/tasks/:id
 *  @desc   Full update of a task (also used to reschedule)
 *  @access Private
 */
router.put('/:id', mutationLimiter, updateTaskValidator, validate, taskController.updateTask);

/** @route  PATCH /api/v1/tasks/:id/complete
 *  @desc   Mark on-time task as complete
 *  @access Private
 */
router.patch('/:id/complete', completeTaskValidator, validate, taskController.completeTask);

/** @route  PATCH /api/v1/tasks/:id/complete-delayed
 *  @desc   Mark delayed task as complete (requires delayReason in body)
 *  @access Private
 */
router.patch(
  '/:id/complete-delayed',
  completeDelayedValidator,
  validate,
  taskController.completeDelayedTask
);

/** @route  PATCH /api/v1/tasks/:id/reopen
 *  @desc   Reopen a completed task
 *  @access Private
 */
router.patch(
  '/:id/reopen',
  [param('id').isMongoId().withMessage('Invalid task ID'), validate],
  taskController.reopenTask
);

/** @route  DELETE /api/v1/tasks/:id
 *  @desc   Soft-delete a task
 *  @access Private
 */
router.delete('/:id', mutationLimiter, deleteTaskValidator, validate, taskController.deleteTask);

router.get(
  '/by-date/:date',
  [
    param('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('date must be YYYY-MM-DD'),
    validate,
  ],
  taskController.getTasksByDate
);


 

module.exports = router;
