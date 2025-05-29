# Use official Node.js image
FROM node:20-alpine

# Add label to link container image to GitHub repository
LABEL org.opencontainers.image.source=https://github.com/dnlml/sintesi

# Install pnpm with specific version to match local environment
RUN npm install -g pnpm@10.10.0

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies (use --force to recreate lockfile if needed)
RUN pnpm install --force --prod

# Copy built application
COPY .svelte-kit/output ./

# Create non-root user
RUN addgroup -g 1001 -S sintesi && \
    adduser -S sintesi -u 1001

# Create necessary directories and set permissions
RUN mkdir -p ./static/summaries && chown -R sintesi:sintesi /app

# Switch to non-root user
USER sintesi

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Start the application
CMD ["node", "server/index.js"]