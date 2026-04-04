import { StatusCodes } from 'http-status-codes';
import taskService from '../services/taskService.js';
import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

// ── GET /api/v1/tasks ─────────────────────────────────────────────────────────
const listTasks = catchAsync(async (req, res) => {
  const { tasks, meta } = await taskService.listTasks(req.user._id, req.query);

  return sendSuccess(res, {
    message: 'Tasks fetched successfully',
    data: { tasks },
    meta,
  });
});

// ── GET /api/v1/tasks/dashboard ───────────────────────────────────────────────
const getDashboard = catchAsync(async (req, res) => {
  const data = await taskService.getDashboard(req.user._id);

  return sendSuccess(res, {
    message: 'Dashboard data fetched',
    data,
  });
});

// ── GET /api/v1/tasks/calendar?year=2024&month=6 ──────────────────────────────
const getCalendar = catchAsync(async (req, res) => {
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();
  const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;

  if (month < 1 || month > 12) {
    return sendSuccess(res, { message: 'Invalid month', data: null });
  }

  const data = await taskService.getCalendarMonth(req.user._id, year, month);
  return sendSuccess(res, {
    message: 'Calendar data fetched',
    data,
  });
});

// ── GET /api/v1/tasks/by-date/:date ──────────────────────────────────────────
const getTasksByDate = catchAsync(async (req, res) => {
  const tasks = await taskService.getTasksByDate(req.user._id, req.params.date);

  return sendSuccess(res, {
    message: `Tasks for ${req.params.date}`,
    data: { tasks, count: tasks.length },
  });
});

// ── GET /api/v1/tasks/:id ─────────────────────────────────────────────────────
const getTask = catchAsync(async (req, res) => {
  const task = await taskService.getTaskById(req.user._id, req.params.id);

  return sendSuccess(res, {
    message: 'Task fetched',
    data: { task },
  });
});

// ── POST /api/v1/tasks ────────────────────────────────────────────────────────
const createTask = catchAsync(async (req, res) => {
  const { title, notes, category, priority, scheduledDate, scheduledTime, duration } = req.body;
  const task = await taskService.createTask(req.user._id, {
    title,
    notes,
    category,
    priority,
    scheduledDate,
    scheduledTime,
    duration,
  });

  return sendSuccess(res, {
    statusCode: StatusCodes.CREATED,
    message: 'Task created successfully',
    data: { task },
  });
});

// ── PUT /api/v1/tasks/:id ─────────────────────────────────────────────────────
const updateTask = catchAsync(async (req, res) => {
  const { title, notes, category, priority, scheduledDate, scheduledTime, duration } = req.body;
  const task = await taskService.updateTask(req.user._id, req.params.id, {
    title,
    notes,
    category,
    priority,
    scheduledDate,
    scheduledTime,
    duration,
  });

  return sendSuccess(res, {
    message: 'Task updated successfully',
    data: { task },
  });
});

// ── PATCH /api/v1/tasks/:id/complete ─────────────────────────────────────────
const completeTask = catchAsync(async (req, res) => {
  const task = await taskService.completeTask(req.user._id, req.params.id);

  return sendSuccess(res, {
    message: 'Task marked as complete',
    data: { task },
  });
});

// ── PATCH /api/v1/tasks/:id/complete-delayed ─────────────────────────────────
const completeDelayedTask = catchAsync(async (req, res) => {
  const { delayReason } = req.body;
  const task = await taskService.completeDelayedTask(req.user._id, req.params.id, delayReason);

  return sendSuccess(res, {
    message: 'Delayed task completed with reason recorded',
    data: { task },
  });
});

// ── PATCH /api/v1/tasks/:id/reopen ───────────────────────────────────────────
const reopenTask = catchAsync(async (req, res) => {
  const task = await taskService.reopenTask(req.user._id, req.params.id);

  return sendSuccess(res, {
    message: 'Task reopened',
    data: { task },
  });
});

// ── PATCH /api/v1/tasks/sync-delayed ─────────────────────────────────────────
const syncDelayed = catchAsync(async (req, res) => {
  const result = await taskService.syncDelayed(req.user._id);

  return sendSuccess(res, {
    message: `Delayed sync complete. ${result.synced} task(s) updated.`,
    data: result,
  });
});

// ── DELETE /api/v1/tasks/:id ──────────────────────────────────────────────────
const deleteTask = catchAsync(async (req, res) => {
  await taskService.deleteTask(req.user._id, req.params.id);

  return sendSuccess(res, {
    statusCode: StatusCodes.OK,
    message: 'Task deleted successfully',
  });
});

// ── GET /api/v1/tasks/sync-all-delayed ─────────────────────────────────────────
const syncAllDelayed = catchAsync(async (req, res) => {
  logger.info(`API endpoint /tasks/sync-all-delayed called`);
  const result = await taskService.syncAllDelayed();

  return sendSuccess(res, {
    message: `Delayed sync complete. ${result.synced} task(s) updated.`,
    data: result,
  });
});

// const getTasksByDate = catchAsync(async (req, res) => {
//   const tasks = await taskService.getTasksByDate(req.user._id, req.params.date);
//   return sendSuccess(res, {
//     message: `Tasks for ${req.params.date}`,
//     data: { tasks, count: tasks.length },
//   });
// });

export {
  listTasks,
  getDashboard,
  getCalendar,
  getTasksByDate,
  getTask,
  createTask,
  updateTask,
  completeTask,
  completeDelayedTask,
  reopenTask,
  syncDelayed,
  deleteTask,
  syncAllDelayed,
};
