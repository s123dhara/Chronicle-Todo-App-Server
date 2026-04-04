import cron from 'node-cron';
import Task from '../models/Task.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import taskService from '../services/taskService.js';

// const cron = require('node-cron');
// const Task = require('../models/Task.js');
// const User = require('../models/User.js');
// const logger = require('../utils/logger.js');
// const taskService = require('../services/taskService.js');

/**
 * Sync delayed tasks for all users every 60 seconds
 */
export function startSyncDelayedCron() {
  // Run every 120 seconds
  cron.schedule('*/120 * * * * *', async () => {
    try {
      logger.info('Starting scheduled sync delayed tasks job');

      // Get all users
      const users = await User.find().select('_id');

      let totalSynced = 0;

      for (const user of users) {
        const { synced } = await taskService.syncDelayed(user._id);
        totalSynced += synced;
      }

      logger.info(`Cron job completed: Synced ${totalSynced} tasks across ${users.length} users`);
    } catch (error) {
      logger.error(`Error in syncDelayedTasks cron job: ${error.message}`);
    }
  });

  logger.info('Sync delayed tasks cron job started (every 120 seconds)');
}

/**
 * Alternative: Sync for specific user (called from API)
 */
export async function syncDelayedForUser(userId) {
  try {
    const count = await Task.syncDelayedStatus(userId);
    logger.info(`Manually synced ${count} tasks for user ${userId}`);
    return { synced: count };
  } catch (error) {
    logger.error(`Error syncing delayed tasks for user ${userId}: ${error.message}`);
    throw error;
  }
}
