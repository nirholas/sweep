# ============================================
# Piggy Bank API Server - Production Dockerfile
# Multi-stage build for minimal image size
# ============================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps

WORKDIR /app

# Install build dependencies needed for native modules
RUN apk add --no-cache python3 make g++

# Copy package files for layer caching
COPY package*.json ./

# Install all dependencies
RUN npm ci --legacy-peer-deps

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

# Copy source code
COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY src ./src
COPY drizzle ./drizzle

# Build TypeScript
RUN npm run build

# Prune dev dependencies for smaller image
RUN npm prune --production --legacy-peer-deps

# ============================================
# Stage 3: Runner (minimal production image)
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Add security updates and create non-root user
RUN apk add --no-cache dumb-init wget \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 piggybank

# Copy only production artifacts
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

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "dist/api/index.js"]
