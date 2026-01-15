# ============================================
# Piggy Bank API Server - Production Dockerfile
# ============================================

# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# ============================================
# Stage 2: Runner
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 piggybank

# Copy built application
COPY --from=builder --chown=piggybank:nodejs /app/dist ./dist
COPY --from=builder --chown=piggybank:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=piggybank:nodejs /app/package.json ./
COPY --from=builder --chown=piggybank:nodejs /app/drizzle ./drizzle

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Switch to non-root user
USER piggybank

# Start the server
CMD ["node", "dist/api/index.js"]
