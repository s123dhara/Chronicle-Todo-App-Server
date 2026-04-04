import morgan from 'morgan';
import logger from '../utils/logger.js';

// ── Custom Morgan token: response body size ───────────────────────────────────
morgan.token('body-size', (req, res) => {
  const len = res.getHeader('content-length');
  return len ? `${len}b` : '-';
});

// ── Token: authenticated user id ──────────────────────────────────────────────
morgan.token('user-id', (req) => (req.user ? req.user._id.toString() : 'anon'));

// ── Format strings ────────────────────────────────────────────────────────────
const DEV_FORMAT = ':method :url :status :response-time ms — :body-size [user::user-id]';
const PROD_FORMAT =
  ':remote-addr :method :url :status :response-time ms :body-size [user::user-id]';

const httpLogger = morgan(process.env.NODE_ENV === 'production' ? PROD_FORMAT : DEV_FORMAT, {
  stream: logger.stream,
});

export default httpLogger;
