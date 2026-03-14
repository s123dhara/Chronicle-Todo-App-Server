# Chronicle Backend API

> Production-ready REST API for Chronicle Task Manager built with Node.js, Express, and MongoDB

[![Node.js](https://img.shields.io/badge/Node.js-22.15.0-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19.2-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.4.1-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Client Application](#client-application)
- [Deployment](#deployment)
- [License](#license)

---

## ✨ Features

- 🔐 **JWT Authentication** - Access & refresh token with rotation
- 🛡️ **Security** - Helmet, CORS, rate limiting, XSS protection, NoSQL injection prevention
- 📝 **Task Management** - CRUD operations with status tracking (pending, delayed, completed)
- 📅 **Calendar View** - Monthly task aggregation and date-specific queries
- 🎯 **Dashboard** - Real-time stats, current task, next task, delayed alerts
- ⏰ **Auto-Delay Detection** - Automatic marking of overdue tasks
- 🗑️ **Soft Delete** - Tasks are never permanently deleted
- 📊 **Filtering & Sorting** - By date, status, priority, category
- 📄 **Pagination** - Efficient data loading
- 🧪 **Testing** - Jest + Supertest integration tests
- 📝 **Logging** - Winston with daily log rotation
- ✅ **Validation** - Express-validator for request validation

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 22.15.0+ | Runtime environment |
| **Express** | 4.19.2 | Web framework |
| **MongoDB** | 8.4.1 | Database |
| **Mongoose** | 8.4.1 | ODM |
| **JWT** | 9.0.2 | Authentication |
| **Bcrypt** | 2.4.3 | Password hashing |
| **Winston** | 3.13.0 | Logging |
| **Jest** | 29.7.0 | Testing |
| **Helmet** | 7.1.0 | Security headers |

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 22.15.0 ([Download](https://nodejs.org/))
- **npm** >= 10.x (comes with Node.js)
- **MongoDB** >= 6.0 (Local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **Git** ([Download](https://git-scm.com/))

Check versions:
```bash
node --version  # Should be >= 22.15.0
npm --version   # Should be >= 10.x
```

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/chronicle-backend.git
cd chronicle-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration (see [Environment Variables](#environment-variables) section).

### 4. Generate JWT Secrets

Generate secure random secrets:

```bash
# For JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# For JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output to your `.env` file.

### 5. Start MongoDB

**Local MongoDB:**
```bash
mongod
```

**Or use MongoDB Atlas** (recommended for production)

### 6. Run the Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server will run on `http://localhost:5000`

---

## 🔐 Environment Variables

Create a `.env` file with the following variables:

```env
# ── Server Configuration ──────────────────────────────────────────────
NODE_ENV=development
PORT=5000

# ── Database ──────────────────────────────────────────────────────────
MONGO_URI=mongodb://localhost:27017/chronicle
# For MongoDB Atlas:
# MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/chronicle

# ── JWT Secrets (REQUIRED - Generate using crypto) ───────────────────
JWT_SECRET=your_64_character_random_secret_here
JWT_REFRESH_SECRET=your_64_character_random_refresh_secret_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# ── Security ──────────────────────────────────────────────────────────
BCRYPT_ROUNDS=12

# ── CORS ──────────────────────────────────────────────────────────────
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
# For production, add your frontend URL:
# CORS_ORIGINS=https://your-frontend-url.vercel.app

# ── Rate Limiting ─────────────────────────────────────────────────────
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` or `production` |
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/chronicle` |
| `JWT_SECRET` | Access token secret (min 64 chars) | Generated via crypto |
| `JWT_REFRESH_SECRET` | Refresh token secret (min 64 chars) | Generated via crypto |

---

## 📡 API Endpoints

**Base URL:** `http://localhost:5000/api/v1`

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | ❌ |
| POST | `/auth/login` | Login user | ❌ |
| POST | `/auth/refresh` | Refresh access token | ❌ |
| POST | `/auth/logout` | Logout user | ✅ |
| GET | `/auth/me` | Get current user | ✅ |
| PATCH | `/auth/me` | Update user profile | ✅ |
| PATCH | `/auth/change-password` | Change password | ✅ |

### Tasks

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/tasks` | List all tasks (with filters) | ✅ |
| POST | `/tasks` | Create new task | ✅ |
| GET | `/tasks/dashboard` | Get dashboard data | ✅ |
| GET | `/tasks/calendar` | Get calendar month view | ✅ |
| GET | `/tasks/by-date/:date` | Get tasks by specific date | ✅ |
| GET | `/tasks/:id` | Get single task | ✅ |
| PUT | `/tasks/:id` | Update task | ✅ |
| DELETE | `/tasks/:id` | Delete task (soft delete) | ✅ |
| PATCH | `/tasks/:id/complete` | Mark task complete | ✅ |
| PATCH | `/tasks/:id/complete-delayed` | Complete delayed task | ✅ |
| PATCH | `/tasks/:id/reopen` | Reopen completed task | ✅ |
| PATCH | `/tasks/sync-delayed` | Sync delayed status | ✅ |

### Health Check

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Full health check | ❌ |
| GET | `/health/ping` | Simple ping | ❌ |

### Query Parameters (GET /tasks)

```
?date=YYYY-MM-DD              # Filter by date
&status=pending|completed|delayed|all
&priority=low|medium|high|all
&category=Work|Personal|Health|Learning|Finance|Other|all
&page=1                       # Pagination
&limit=50                     # Results per page (max 100)
&sortBy=scheduledTime|priority|createdAt|title
&order=asc|desc
```

### Example Requests

**Register:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "confirmPassword": "password123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Create Task:**
```bash
curl -X POST http://localhost:5000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "Team Meeting",
    "category": "Work",
    "priority": "high",
    "scheduledDate": "2024-12-20",
    "scheduledTime": "2024-12-20T10:00",
    "duration": 60,
    "notes": "Discuss Q1 roadmap"
  }'
```

**Get Tasks:**
```bash
curl -X GET "http://localhost:5000/api/v1/tasks?status=pending&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 📁 Project Structure

```
chronicle-backend/
├── src/
│   ├── config/
│   │   └── database.js           # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js     # Auth endpoints
│   │   ├── taskController.js     # Task endpoints
│   │   └── healthController.js   # Health check
│   ├── middleware/
│   │   ├── auth.js               # JWT verification
│   │   ├── errorHandler.js       # Global error handler
│   │   ├── httpLogger.js         # Request logging
│   │   ├── rateLimiter.js        # Rate limiting
│   │   └── validate.js           # Validation middleware
│   ├── models/
│   │   ├── User.js               # User schema
│   │   └── Task.js               # Task schema
│   ├── routes/
│   │   ├── index.js              # Route aggregator
│   │   ├── authRoutes.js         # Auth routes
│   │   ├── taskRoutes.js         # Task routes
│   │   └── healthRoutes.js       # Health routes
│   ├── services/
│   │   ├── authService.js        # Auth business logic
│   │   └── taskService.js        # Task business logic
│   ├── utils/
│   │   ├── AppError.js           # Custom error class
│   │   ├── apiResponse.js        # Response formatter
│   │   ├── catchAsync.js         # Async error wrapper
│   │   └── logger.js             # Winston logger
│   ├── validators/
│   │   ├── authValidators.js     # Auth validation rules
│   │   └── taskValidators.js     # Task validation rules
│   ├── app.js                    # Express app setup
│   └── server.js                 # Server entry point
├── test/
│   ├── setup.js                  # Test configuration
│   └── api.test.js               # Integration tests
├── logs/                         # Log files (auto-generated)
├── .env                          # Environment variables
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore rules
├── .prettierrc                   # Prettier config
├── .prettierignore               # Prettier ignore
├── package.json                  # Dependencies
└── README.md                     # This file
```

---

## 📜 Scripts

```bash
# Development
npm run dev              # Start with nodemon (auto-reload)

# Production
npm start                # Start server

# Testing
npm test                 # Run Jest tests

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run format:check     # Check formatting without changes
```

---

## 💻 Client Application

### Frontend Repository

The Chronicle frontend is built with **React 18 + Vite**.

**GitHub:** [https://github.com/yourusername/chronicle-frontend](https://github.com/yourusername/chronicle-frontend)

### Install Client Project

```bash
# Clone the repository
git clone https://github.com/yourusername/chronicle-frontend.git
cd chronicle-frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and set backend URL
# VITE_API_BASE_URL=http://localhost:5000/api/v1

# Start development server
npm run dev
```

The client will run on `http://localhost:5173` (Vite default) or `http://localhost:3000`.

### Client Features

- ✅ Dashboard with real-time stats
- ✅ Task management (CRUD)
- ✅ Calendar view
- ✅ Delayed task tracking
- ✅ Dark/Light theme
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ JWT authentication

---

## 🚀 Deployment

### Deploy Backend

#### Option 1: Render (Recommended)

1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Create new **Web Service**
4. Connect GitHub repository
5. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment Variables:** Add all from `.env`
6. Deploy

#### Option 2: Railway

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Add environment variables
4. Deploy

#### Option 3: Heroku

```bash
heroku create chronicle-api
heroku config:set NODE_ENV=production
heroku config:set MONGO_URI=your_mongodb_atlas_uri
heroku config:set JWT_SECRET=your_secret
# ... add all env vars
git push heroku main
```

### Database (MongoDB Atlas)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster (M0)
3. Create database user
4. Whitelist IP: `0.0.0.0/0` (allow all)
5. Get connection string
6. Update `MONGO_URI` in production environment

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/chronicle
JWT_SECRET=your_production_secret
JWT_REFRESH_SECRET=your_production_refresh_secret
CORS_ORIGINS=https://your-frontend-url.vercel.app
```

---

## 🧪 Testing

Run the test suite:

```bash
npm test
```

**Test Coverage:**
- ✅ Authentication (register, login, refresh, logout)
- ✅ Task CRUD operations
- ✅ Task status transitions
- ✅ Delayed task flow
- ✅ Dashboard data
- ✅ Calendar aggregation
- ✅ Health checks

---

## 🔒 Security Features

- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - Prevent brute force attacks
- **XSS Protection** - Clean user input
- **NoSQL Injection Prevention** - Sanitize MongoDB queries
- **HPP** - HTTP parameter pollution protection
- **JWT** - Secure token-based authentication
- **Bcrypt** - Password hashing (12 rounds)
- **Refresh Token Rotation** - Automatic token refresh
- **Token Reuse Detection** - Revoke all tokens on reuse

---

## 📝 License

This project is licensed under the **MIT License**.

---

## 👥 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📧 Support

For issues or questions:
- Open an issue on GitHub
- Email: support@chronicle-app.com

---

## 🙏 Acknowledgments

- Built with [Express](https://expressjs.com/)
- Database by [MongoDB](https://www.mongodb.com/)
- Authentication with [JWT](https://jwt.io/)

---

**Made with ❤️ by Chronicle Team**
