import path from 'path';
import winston from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const LOG_DIR = process.env.LOG_DIR || 'logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const IS_PROD = process.env.NODE_ENV === 'production';

// ── Custom console format ─────────────────────────────────────────────────────
const consoleFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level}]: ${stack || message}${metaStr}`;
});

// ── Daily rotate transport (all logs) ─────────────────────────────────────────
const fileRotateTransport = new winston.transports.DailyRotateFile({
  dirname: path.resolve(LOG_DIR),
  filename: 'chronicle-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: combine(timestamp(), errors({ stack: true }), json()),
});

// ── Daily rotate transport (errors only) ──────────────────────────────────────
const errorRotateTransport = new winston.transports.DailyRotateFile({
  level: 'error',
  dirname: path.resolve(LOG_DIR),
  filename: 'chronicle-error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: combine(timestamp(), errors({ stack: true }), json()),
});

// ── Console transport ─────────────────────────────────────────────────────────
const consoleTransport = new winston.transports.Console({
  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'HH:mm:ss' }),
    errors({ stack: true }),
    consoleFormat
  ),
});

const logger = winston.createLogger({
  level: LOG_LEVEL,
  exitOnError: false,
  // transports: IS_PROD
  //   ? [fileRotateTransport, errorRotateTransport, consoleTransport]
  //   : [consoleTransport, fileRotateTransport, errorRotateTransport],
  transports: [consoleTransport],
});

// Stream interface for Morgan HTTP logger
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

export default logger;
