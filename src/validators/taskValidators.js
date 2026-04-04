import { body, query, param } from 'express-validator';
import { CATEGORIES, PRIORITIES } from '../models/Task.js';

// ── Reusable field validators ─────────────────────────────────────────────────
const titleField = (required = true) => {
  const chain = body('title').trim();
  if (required) chain.notEmpty().withMessage('Title is required');
  return chain
    .optional(!required)
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be 1–200 characters');
};

const categoryField = (required = false) =>
  body('category')
    .optional(!required)
    .isIn(CATEGORIES)
    .withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`);

const priorityField = (required = false) =>
  body('priority')
    .optional(!required)
    .isIn(PRIORITIES)
    .withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}`);

const scheduledDateField = (required = true) => {
  const chain = body('scheduledDate');
  if (required) chain.notEmpty().withMessage('Scheduled date is required');
  return chain
    .optional(!required)
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('scheduledDate must be YYYY-MM-DD')
    .custom((val) => {
      const d = new Date(val);
      if (isNaN(d.getTime())) throw new Error('scheduledDate is not a valid date');
      return true;
    });
};

const scheduledTimeField = (required = true) => {
  const chain = body('scheduledTime');
  if (required) chain.notEmpty().withMessage('Scheduled time is required');
  return chain
    .optional(!required)
    .matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    .withMessage('scheduledTime must be in format YYYY-MM-DDTHH:mm')
    .custom((val) => {
      if (isNaN(new Date(val).getTime())) throw new Error('scheduledTime is not a valid datetime');
      return true;
    });
};

const durationField = (required = false) =>
  body('duration')
    .optional()
    .isInt({ min: 5, max: 480 })
    .withMessage('Duration must be 5–480 minutes');

const notesField = () =>
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters');

const timezoneField = (required = false) =>
  body('timezone')
    .if(() => required)
    .notEmpty()
    .withMessage('Timezone is required')
    .isString()
    .withMessage('Timezone must be a string')
    .trim();

const timezoneOffsetField = (required = false) =>
  body('timezoneOffset')
    .if(() => required)
    .notEmpty()
    .withMessage('Timezone offset is required')
    .isInt()
    .withMessage('Timezone offset must be an integer')
    .toInt();

// ── Exported validator chains ─────────────────────────────────────────────────

/** POST /tasks */
const createTaskValidator = [
  titleField(true),
  categoryField(false),
  priorityField(false),
  scheduledDateField(true),
  scheduledTimeField(true),
  durationField(),
  notesField(),
  timezoneField(true),
  timezoneOffsetField(true),
];

/** PUT /tasks/:id */
const updateTaskValidator = [
  param('id').isMongoId().withMessage('Invalid task ID'),
  titleField(false),
  categoryField(false),
  priorityField(false),
  scheduledDateField(false),
  scheduledTimeField(false),
  durationField(),
  notesField(),
];

/** PATCH /tasks/:id/complete */
const completeTaskValidator = [param('id').isMongoId().withMessage('Invalid task ID')];

/** PATCH /tasks/:id/complete-delayed */
const completeDelayedValidator = [
  param('id').isMongoId().withMessage('Invalid task ID'),
  body('delayReason')
    .trim()
    .notEmpty()
    .withMessage('Delay reason is required for delayed tasks')
    .isLength({ min: 3, max: 500 })
    .withMessage('Delay reason must be 3–500 characters'),
];

/** GET /tasks — query string filters */
const listTasksValidator = [
  query('date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date filter must be YYYY-MM-DD'),

  query('status')
    .optional()
    .isIn(['pending', 'completed', 'delayed', 'all'])
    .withMessage('status must be: pending | completed | delayed | all'),

  query('priority')
    .optional()
    .isIn([...PRIORITIES, 'all'])
    .withMessage(`priority must be one of: ${[...PRIORITIES, 'all'].join(', ')}`),

  query('category')
    .optional()
    .isIn([...CATEGORIES, 'all'])
    .withMessage(`category must be one of: ${[...CATEGORIES, 'all'].join(', ')}`),

  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),

  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1–100'),

  query('sortBy')
    .optional()
    .isIn(['scheduledTime', 'priority', 'createdAt', 'title'])
    .withMessage('sortBy must be: scheduledTime | priority | createdAt | title'),

  query('order').optional().isIn(['asc', 'desc']).withMessage('order must be asc or desc'),
];

/** DELETE /tasks/:id */
const deleteTaskValidator = [param('id').isMongoId().withMessage('Invalid task ID')];

/** GET /tasks/:id */
const getTaskValidator = [param('id').isMongoId().withMessage('Invalid task ID')];

export {
  createTaskValidator,
  updateTaskValidator,
  completeTaskValidator,
  completeDelayedValidator,
  listTasksValidator,
  deleteTaskValidator,
  getTaskValidator,
};
