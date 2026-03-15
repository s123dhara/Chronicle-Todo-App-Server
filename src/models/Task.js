'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ── Enums (kept in sync with React CATEGORIES / priority values) ──────────────
const CATEGORIES = ['Work', 'Personal', 'Health', 'Learning', 'Finance', 'Other'];
const PRIORITIES = ['low', 'medium', 'high'];

// ── Schema ────────────────────────────────────────────────────────────────────
const taskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // ── Core fields ───────────────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [1, 'Title cannot be empty'],
      maxlength: [200, 'Title must not exceed 200 characters'],
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes must not exceed 1000 characters'],
      default: '',
    },

    category: {
      type: String,
      enum: { values: CATEGORIES, message: `Category must be one of: ${CATEGORIES.join(', ')}` },
      default: 'Other',
    },

    priority: {
      type: String,
      enum: { values: PRIORITIES, message: `Priority must be one of: ${PRIORITIES.join(', ')}` },
      default: 'medium',
    },

    // ── Scheduling ────────────────────────────────────────────────────────────
    scheduledDate: {
      type: String, // "YYYY-MM-DD"  — stored as string for easy date filter queries
      required: [true, 'Scheduled date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'scheduledDate must be in YYYY-MM-DD format'],
      index: true,
    },

    scheduledTime: {
      type: String, // ISO datetime string "YYYY-MM-DDTHH:mm"
      required: [true, 'Scheduled time is required'],
    },

    duration: {
      type: Number, // minutes
      min: [5, 'Duration must be at least 5 minutes'],
      max: [480, 'Duration cannot exceed 8 hours (480 minutes)'],
      default: 30,
    },

    // ── Status ────────────────────────────────────────────────────────────────
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },

    completedAt: {
      type: Date,
    },

    delayed: {
      type: Boolean,
      default: false,
      index: true,
    },

    delayReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Delay reason must not exceed 500 characters'],
      default: '',
    },

    // ── Soft delete ───────────────────────────────────────────────────────────
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Compound indexes for common query patterns ─────────────────────────────────
taskSchema.index({ user: 1, scheduledDate: 1 });
taskSchema.index({ user: 1, delayed: 1, completed: 1 });
taskSchema.index({ user: 1, completed: 1, createdAt: -1 });
taskSchema.index({ user: 1, isDeleted: 1, scheduledDate: 1, scheduledTime: 1 });

// ── Virtual: computed status string ──────────────────────────────────────────
taskSchema.virtual('status').get(function () {
  if (this.completed) return 'completed';
  if (this.delayed) return 'delayed';
  return 'pending';
});

// ── Pre-save: auto-mark delayed when scheduled end time has passed ────────────
taskSchema.pre('save', function (next) {
  if (!this.completed && !this.delayed && this.scheduledTime) {
    const end = new Date(this.scheduledTime);
    end.setMinutes(end.getMinutes() + (this.duration || 30));
    if (end < new Date()) this.delayed = true;
  }
  next();
});

// ── Pre-save: set completedAt when completing ─────────────────────────────────
taskSchema.pre('save', function (next) {
  if (this.isModified('completed') && this.completed && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

// ── Query helper — automatically exclude soft-deleted tasks ──────────────────
taskSchema.pre(/^find/, function (next) {
  // Allow explicit override with { includeDeleted: true }
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

// ── Static: bulk-mark past-due tasks as delayed ───────────────────────────────
taskSchema.statics.syncDelayedStatus = async function (userId) {
  const now = new Date();  
  logger.info(`Running syncDelayedStatus for user ${userId} at ${now.toISOString()}`);
  const result = await this.updateMany(
    {
      user: userId,
      completed: false,
      delayed: false,
      isDeleted: false,
    },
    [
      {
        $set: {
          delayed: {
            $lt: [
              {
                $dateAdd: {
                  startDate: { $dateFromString: { dateString: '$scheduledTime' } },
                  unit: 'minute',
                  amount: '$duration',
                },
              },
              now,
            ],
          },
        },
      },
    ]
  );
  logger.info(`syncDelayedStatus updated ${result.modifiedCount} tasks for user ${userId}`);
  return result.modifiedCount;
};

const Task = mongoose.model('Task', taskSchema);
module.exports = { Task, CATEGORIES, PRIORITIES };
