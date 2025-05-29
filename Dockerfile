# Use official Node.js image
FROM node:20-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY .svelte-kit/output ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S sintesi -u 1001

# Create necessary directories and set permissions
RUN mkdir -p ./static/summaries && chown -R sintesi:nodejs /app

# Switch to non-root user
USER sintesi

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Start the application
CMD ["node", "index.js"]