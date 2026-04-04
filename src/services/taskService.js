import { Task } from '../models/Task.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';
import User from '../models/User.js';

class TaskService {
  /**
   * List tasks for a user with filtering, sorting, pagination
   */
  async listTasks(userId, queryParams = {}) {
    const {
      date,
      status = 'all',
      priority = 'all',
      category = 'all',
      page = 1,
      limit = 50,
      sortBy = 'scheduledTime',
      order = 'asc',
    } = queryParams;

    // ── Auto-sync delayed status before fetching ──────────────────────────────
    await Task.syncDelayedStatus(userId);

    // ── Build filter ──────────────────────────────────────────────────────────
    const filter = { user: userId };

    if (date) filter.scheduledDate = date;
    if (priority !== 'all') filter.priority = priority;
    if (category !== 'all') filter.category = category;

    if (status === 'completed') {
      filter.completed = true;
    }
    if (status === 'pending') {
      filter.completed = false;
      filter.delayed = false;
    }
    if (status === 'delayed') {
      filter.delayed = true;
      filter.completed = false;
    }

    // ── Sort ──────────────────────────────────────────────────────────────────
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortMap = {
      scheduledTime: { scheduledDate: sortOrder, scheduledTime: sortOrder },
      priority: { priority: sortOrder, scheduledTime: 1 },
      createdAt: { createdAt: sortOrder },
      title: { title: sortOrder },
    };
    const sort = sortMap[sortBy] || sortMap.scheduledTime;

    // ── Paginate ──────────────────────────────────────────────────────────────
    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * pageSize;

    const [tasks, total] = await Promise.all([
      Task.find(filter).sort(sort).skip(skip).limit(pageSize).lean({ virtuals: true }),
      Task.countDocuments(filter),
    ]);

    return {
      tasks,
      meta: {
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasNext: pageNum * pageSize < total,
        hasPrev: pageNum > 1,
      },
    };
  }

  /**
   * Get tasks for a specific date (calendar view)
   */
  async getTasksByDate(userId, dateStr) {
    await Task.syncDelayedStatus(userId);
    const tasks = await Task.find({ user: userId, scheduledDate: dateStr })
      .sort({ scheduledTime: 1 })
      .lean({ virtuals: true });
    return tasks;
  }

  /**
   * Get a single task by ID — ownership verified
   */
  async getTaskById(userId, taskId) {
    const task = await Task.findOne({ _id: taskId, user: userId }).lean({ virtuals: true });
    if (!task) throw AppError.notFound('Task not found');
    return task;
  }

  /**
   * Create a new task
   */
  async createTask(userId, payload) {
    const task = await Task.create({ ...payload, user: userId });
    logger.info(`Task created: ${task._id} by user ${userId}`);
    return task.toObject({ virtuals: true });
  }

  /**
   * Update task fields — also resets delayed if rescheduled to future
   */
  async updateTask(userId, taskId, updates) {
    const task = await Task.findOne({ _id: taskId, user: userId });
    if (!task) throw AppError.notFound('Task not found');

    // If rescheduling to a future time, clear delayed flag
    if (updates.scheduledTime || updates.scheduledDate) {
      const newTime = updates.scheduledTime || task.scheduledTime;
      const newDur = updates.duration || task.duration;
      const end = new Date(newTime);
      end.setMinutes(end.getMinutes() + (newDur || 30));
      if (end > new Date()) {
        updates.delayed = false;
      }
    }

    Object.assign(task, updates);
    await task.save();
    logger.info(`Task updated: ${taskId} by user ${userId}`);
    return task.toObject({ virtuals: true });
  }

  /**
   * Mark task as completed (on-time)
   */
  async completeTask(userId, taskId) {
    const task = await Task.findOne({ _id: taskId, user: userId });
    if (!task) throw AppError.notFound('Task not found');
    if (task.completed) throw AppError.badRequest('Task is already completed');

    // If task is delayed, require delayReason (use completeDelayedTask instead)
    if (task.delayed) {
      throw AppError.badRequest(
        'This task is delayed. Use PATCH /tasks/:id/complete-delayed and provide a delay reason.'
      );
    }

    task.completed = true;
    task.completedAt = new Date();
    await task.save();
    logger.info(`Task completed: ${taskId} by user ${userId}`);
    return task.toObject({ virtuals: true });
  }

  /**
   * Mark delayed task as completed — requires a reason
   */
  async completeDelayedTask(userId, taskId, delayReason) {
    const task = await Task.findOne({ _id: taskId, user: userId });
    logger.info(
      `Attempting to complete delayed task: ${taskId} by user ${userId} with reason: ${delayReason}`
    );
    logger.debug(`Task details: ${JSON.stringify(task)}`);
    logger.debug(`current time: ${new Date().toISOString()}`);
    if (!task) throw AppError.notFound('Task not found');
    if (task.completed) throw AppError.badRequest('Task is already completed');
    if (!task.delayed) throw AppError.badRequest('Task is not marked as delayed');

    task.completed = true;
    task.completedAt = new Date();
    task.delayed = true;
    task.delayReason = delayReason.trim();
    await task.save();
    logger.info(`Delayed task completed: ${taskId} by user ${userId}. Reason: ${delayReason}`);
    return task.toObject({ virtuals: true });
  }

  /**
   * Reopen a completed task
   */
  async reopenTask(userId, taskId) {
    const task = await Task.findOne({ _id: taskId, user: userId });
    if (!task) throw AppError.notFound('Task not found');
    if (!task.completed) throw AppError.badRequest('Task is not completed');

    task.completed = false;
    task.completedAt = undefined;
    // Re-evaluate delayed status
    if (task.scheduledTime) {
      const end = new Date(task.scheduledTime);
      end.setMinutes(end.getMinutes() + (task.duration || 30));
      task.delayed = end < new Date();
    }
    await task.save();
    logger.info(`Task reopened: ${taskId} by user ${userId}`);
    return task.toObject({ virtuals: true });
  }

  /**
   * Soft-delete a task
   */
  async deleteTask(userId, taskId) {
    const task = await Task.findOne({ _id: taskId, user: userId });
    if (!task) throw AppError.notFound('Task not found');

    task.isDeleted = true;
    task.deletedAt = new Date();
    await task.save();
    logger.info(`Task soft-deleted: ${taskId} by user ${userId}`);
  }

  /**
   * Dashboard summary — today's stats + current + next task
   */
  async getDashboard(userId) {
    await Task.syncDelayedStatus(userId);

    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();

    const todayTasks = await Task.find({ user: userId, scheduledDate: today })
      .sort({ scheduledTime: 1 })
      .lean({ virtuals: true });

    const allDelayed = await Task.find({ user: userId, delayed: true, completed: false })
      .sort({ scheduledTime: 1 })
      .lean({ virtuals: true });

    // Current task — scheduled window includes now
    const currentTask =
      todayTasks.find((t) => {
        if (t.completed || t.delayed) return false;
        const start = new Date(t.scheduledTime);
        const end = new Date(t.scheduledTime);
        end.setMinutes(end.getMinutes() + (t.duration || 30));
        return now >= start && now <= end;
      }) || null;

    // Next upcoming task — starts after now (or after current task)
    const nextTask =
      todayTasks.find((t) => {
        if (t.completed || t.delayed) return false;
        if (currentTask && t._id.toString() === currentTask._id.toString()) return false;
        return new Date(t.scheduledTime) > now;
      }) || null;

    const completed = todayTasks.filter((t) => t.completed).length;
    const delayed = todayTasks.filter((t) => t.delayed && !t.completed).length;
    const pending = todayTasks.filter((t) => !t.completed && !t.delayed).length;

    return {
      today: {
        date: today,
        total: todayTasks.length,
        completed,
        delayed,
        pending,
        completionRate: todayTasks.length ? Math.round((completed / todayTasks.length) * 100) : 0,
      },
      currentTask,
      nextTask,
      allDelayedCount: allDelayed.length,
      allDelayed,
    };
  }

  /**
   * Calendar month view — task counts per day
   */
  async getCalendarMonth(userId, year, month) {
    await Task.syncDelayedStatus(userId);

    // Build date range for the month
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0); // last day of month
    const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    const tasks = await Task.find({
      user: userId,
      scheduledDate: { $gte: start, $lte: end },
    }).lean({ virtuals: true });

    // Aggregate counts per day
    const dayMap = {};
    tasks.forEach((t) => {
      if (!dayMap[t.scheduledDate]) {
        dayMap[t.scheduledDate] = {
          date: t.scheduledDate,
          total: 0,
          completed: 0,
          delayed: 0,
          pending: 0,
        };
      }
      dayMap[t.scheduledDate].total++;
      if (t.completed) dayMap[t.scheduledDate].completed++;
      else if (t.delayed) dayMap[t.scheduledDate].delayed++;
      else dayMap[t.scheduledDate].pending++;
    });

    return {
      year,
      month,
      days: Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  /**
   * Bulk sync delayed status for a user (can be called by a cron job)
   */
  async syncDelayed(userId) {
    logger.info(`invoking syncDelayed for user ${userId}`);
    const count = await Task.syncDelayedStatus(userId);
    return { synced: count };
  }

  async syncAllDelayed() {
    // Add logger
    logger.info('Manually invoking syncDelayed for all users');
    const users = await User.find().select('_id');
    console.log('Users found for sync:', users.length);

    let totalSynced = 0;

    for (const user of users) {
      const { synced } = await this.syncDelayed(user._id);
      totalSynced += synced;
    }

    logger.info(
      `Mannual Invoke completed: Synced ${totalSynced} tasks across ${users.length} users`
    );

    return { synced: totalSynced, users: users.length };
  }
}

export default new TaskService();
