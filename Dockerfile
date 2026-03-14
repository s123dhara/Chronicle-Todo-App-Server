# ── Stage 1: Base ─────────────────────────────────────────────────────────────
FROM node:22.15.0-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies for production
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ── Stage 2: Development ──────────────────────────────────────────────────────
FROM node:22.15.0-alpine AS development

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Start development server with nodemon
CMD ["npm", "run", "dev"]

# ── Stage 3: Production ───────────────────────────────────────────────────────
FROM node:22.15.0-alpine AS production

# Set NODE_ENV
ENV NODE_ENV=production

WORKDIR /app

# Copy production dependencies from base stage
COPY --from=base /app/node_modules ./node_modules

# Copy source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/v1/health/ping', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start production server
CMD ["node", "src/server.js"]
