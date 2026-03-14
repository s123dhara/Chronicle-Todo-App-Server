# Chronicle Backend — API Design & Integration Guide

## Stack
| Layer | Technology |
|---|---|
| Runtime | Node.js v22.15.0 |
| Framework | Express 4.x |
| Database | MongoDB + Mongoose 8 |
| Auth | JWT (access + refresh token rotation) |
| Validation | express-validator 7 |
| Security | helmet, cors, hpp, express-mongo-sanitize, xss-clean |
| Logging | Winston + Morgan + daily-rotate-file |
| Rate Limiting | express-rate-limit (3 tiers) |
| Testing | Jest + Supertest |

---

## Project Structure

```
chronicle-backend/
├── src/
│   ├── server.js              # Entry point + graceful shutdown
│   ├── app.js                 # Express app factory + middleware stack
│   ├── config/
│   │   └── database.js        # Mongoose connect/disconnect + event hooks
│   ├── controllers/
│   │   ├── authController.js  # Auth endpoints (thin — delegates to service)
│   │   ├── taskController.js  # Task endpoints (thin — delegates to service)
│   │   └── healthController.js
│   ├── middleware/
│   │   ├── auth.js            # JWT protect + optionalAuth
│   │   ├── errorHandler.js    # Global error handler + 404
│   │   ├── httpLogger.js      # Morgan → Winston stream
│   │   ├── rateLimiter.js     # api / auth / mutation limiters
│   │   └── validate.js        # express-validator result middleware
│   ├── models/
│   │   ├── User.js            # User schema: bcrypt, JWT methods
│   │   └── Task.js            # Task schema: indexes, virtuals, static methods
│   ├── routes/
│   │   ├── index.js           # Mounts all routers
│   │   ├── authRoutes.js
│   │   ├── taskRoutes.js
│   │   └── healthRoutes.js
│   ├── services/
│   │   ├── authService.js     # register, login, refresh, logout, changePassword
│   │   └── taskService.js     # CRUD + dashboard + calendar + delayed sync
│   ├── utils/
│   │   ├── AppError.js        # Custom operational error class
│   │   ├── apiResponse.js     # sendSuccess / sendError envelopes
│   │   ├── catchAsync.js      # Async controller wrapper
│   │   └── logger.js          # Winston logger singleton
│   └── validators/
│       ├── authValidators.js
│       └── taskValidators.js
└── tests/
    ├── setup.js               # Test env vars
    └── api.test.js            # Integration tests (Jest + Supertest)
```

---

## Response Envelope

Every response follows this consistent shape:

```json
// Success
{
  "success": true,
  "statusCode": 200,
  "message": "Tasks fetched successfully",
  "data": { ... },
  "meta": { "total": 42, "page": 1, "limit": 50, "totalPages": 1, "hasNext": false, "hasPrev": false }
}

// Error
{
  "success": false,
  "statusCode": 422,
  "message": "Validation failed",
  "errors": [
    { "field": "title", "message": "Title is required", "value": "" }
  ]
}
```

---

## Auth Flow

```
POST /register  →  { user, accessToken, refreshToken }
POST /login     →  { user, accessToken, refreshToken }

# All protected requests:
Authorization: Bearer <accessToken>

# When accessToken expires (401):
POST /refresh  body: { refreshToken }  →  { accessToken, refreshToken }

POST /logout   →  invalidates one refreshToken
POST /logout?all=true  →  invalidates ALL refresh tokens (all devices)
```

---

## API Reference

### Base URL
```
/api/v1
```

---

### Auth Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Register new account |
| POST | `/auth/login` | No | Login, receive tokens |
| POST | `/auth/refresh` | No | Rotate refresh → new access token |
| POST | `/auth/logout` | Yes | Logout (+ `?all=true` for all devices) |
| GET | `/auth/me` | Yes | Get current user profile |
| PATCH | `/auth/me` | Yes | Update name / theme |
| PATCH | `/auth/change-password` | Yes | Change password |

#### POST /auth/register
```json
// Request
{ "name": "Ada Lovelace", "email": "ada@example.com", "password": "Secret1234", "confirmPassword": "Secret1234" }
// Response 201
{ "data": { "user": { "_id": "...", "name": "Ada Lovelace", "email": "ada@example.com", "theme": "dark" }, "accessToken": "...", "refreshToken": "..." } }
```

#### POST /auth/login
```json
// Request
{ "email": "ada@example.com", "password": "Secret1234" }
// Response 200
{ "data": { "user": {...}, "accessToken": "...", "refreshToken": "..." } }
```

---

### Task Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tasks` | Yes | List tasks with filters + pagination |
| POST | `/tasks` | Yes | Create task |
| GET | `/tasks/dashboard` | Yes | Home page data |
| GET | `/tasks/calendar` | Yes | Month view summary |
| GET | `/tasks/by-date/:date` | Yes | Tasks for a specific date |
| PATCH | `/tasks/sync-delayed` | Yes | Sync delayed status |
| GET | `/tasks/:id` | Yes | Get single task |
| PUT | `/tasks/:id` | Yes | Update / reschedule task |
| PATCH | `/tasks/:id/complete` | Yes | Mark on-time task complete |
| PATCH | `/tasks/:id/complete-delayed` | Yes | Mark delayed task complete (requires reason) |
| PATCH | `/tasks/:id/reopen` | Yes | Reopen completed task |
| DELETE | `/tasks/:id` | Yes | Soft-delete task |

#### GET /tasks — Query Parameters
| Param | Type | Values | Default |
|-------|------|--------|---------|
| `date` | string | YYYY-MM-DD | all dates |
| `status` | string | `all` `pending` `completed` `delayed` | `all` |
| `priority` | string | `all` `low` `medium` `high` | `all` |
| `category` | string | `all` `Work` `Personal` `Health` `Learning` `Finance` `Other` | `all` |
| `page` | integer | ≥ 1 | `1` |
| `limit` | integer | 1–100 | `50` |
| `sortBy` | string | `scheduledTime` `priority` `createdAt` `title` | `scheduledTime` |
| `order` | string | `asc` `desc` | `asc` |

#### POST /tasks — Request Body
```json
{
  "title": "Client presentation prep",   // required, 1–200 chars
  "category": "Work",                     // Work|Personal|Health|Learning|Finance|Other
  "priority": "high",                     // low|medium|high
  "scheduledDate": "2025-06-15",          // required, YYYY-MM-DD
  "scheduledTime": "2025-06-15T15:00",    // required, YYYY-MM-DDTHH:mm
  "duration": 90,                         // minutes, 5–480, default 30
  "notes": "Slides + demo flow"           // optional
}
```

#### PATCH /tasks/:id/complete-delayed — Request Body
```json
{ "delayReason": "Had an urgent client call that ran over" }
```

#### GET /tasks/dashboard — Response Data
```json
{
  "today": {
    "date": "2025-06-15",
    "total": 5,
    "completed": 2,
    "delayed": 1,
    "pending": 2,
    "completionRate": 40
  },
  "currentTask": { ...task },
  "nextTask": { ...task },
  "allDelayedCount": 3,
  "allDelayed": [ ...tasks ]
}
```

#### GET /tasks/calendar?year=2025&month=6 — Response Data
```json
{
  "year": 2025,
  "month": 6,
  "days": [
    { "date": "2025-06-15", "total": 3, "completed": 1, "delayed": 0, "pending": 2 },
    { "date": "2025-06-16", "total": 2, "completed": 2, "delayed": 0, "pending": 0 }
  ]
}
```

---

## Task Schema

```
_id            ObjectId   auto
user           ObjectId   ref: User
title          String     required, max 200
notes          String     max 1000
category       String     Work|Personal|Health|Learning|Finance|Other
priority       String     low|medium|high
scheduledDate  String     YYYY-MM-DD (indexed)
scheduledTime  String     YYYY-MM-DDTHH:mm
duration       Number     minutes, 5–480
completed      Boolean    default false
completedAt    Date
delayed        Boolean    default false (auto-set by pre-save + static)
delayReason    String     max 500
isDeleted      Boolean    soft-delete flag
deletedAt      Date
createdAt      Date       auto
updatedAt      Date       auto
status         String     virtual: pending|delayed|completed
```

---

## Security Measures

| Concern | Implementation |
|---------|---------------|
| Brute-force login | `authLimiter`: 20 req / 15 min per IP+email |
| API abuse | `apiLimiter`: 100 req / 15 min per IP |
| XSS | `xss-clean`, `helmet` CSP |
| NoSQL injection | `express-mongo-sanitize` |
| HTTP parameter pollution | `hpp` with whitelist |
| JWT replay | Refresh token rotation with reuse detection |
| Password storage | bcrypt, 12 rounds (configurable) |
| Payload bombs | JSON body limit: 10 KB |
| CORS | Allowlist from `CORS_ORIGINS` env |
| Sensitive field leak | `password` / `refreshTokens` have `select: false` |
| Soft delete | Tasks never hard-deleted; `isDeleted` flag |

---

## Setup & Run

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Edit .env — set MONGO_URI and JWT secrets

# 3. Development
npm run dev

# 4. Production
npm start

# 5. Tests (requires MongoDB on localhost:27017)
npm test
```

---

## React Integration Example

Replace `AppContext.js` localStorage calls with these fetch calls:

```js
const API = 'http://localhost:5000/api/v1';

// Store tokens
localStorage.setItem('accessToken', data.accessToken);
localStorage.setItem('refreshToken', data.refreshToken);

const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API}${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
  });

  // Auto-refresh on 401
  if (res.status === 401) {
    const refresh = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: localStorage.getItem('refreshToken') }),
    });
    if (refresh.ok) {
      const { data } = await refresh.json();
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      return authFetch(url, options); // retry original
    }
    // Force logout
    window.location.href = '/login';
  }
  return res.json();
};

// Dashboard
const dashboard = await authFetch('/tasks/dashboard');

// List with filters
const tasks = await authFetch('/tasks?date=2025-06-15&status=pending&sortBy=scheduledTime');

// Create
const task = await authFetch('/tasks', { method: 'POST', body: JSON.stringify(payload) });

// Complete on-time
await authFetch(`/tasks/${id}/complete`, { method: 'PATCH' });

// Complete delayed (requires reason)
await authFetch(`/tasks/${id}/complete-delayed`, {
  method: 'PATCH',
  body: JSON.stringify({ delayReason: 'Meeting ran over' }),
});

// Calendar month
const cal = await authFetch('/tasks/calendar?year=2025&month=6');

// Update / reschedule
await authFetch(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify({ ...payload, scheduledDate: '2025-06-20' }) });
```
