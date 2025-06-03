# ---- Build Stage ----
FROM node:20-alpine AS build

# Add label to link container image to GitHub repository
LABEL org.opencontainers.image.source=https://github.com/dnlml/sintesi

# Install pnpm
RUN npm install -g pnpm@10.10.0

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy the rest of the source code
COPY . .

ENV LOG_LEVEL=info
ENV NODE_ENV=production
ENV DATABASE_URL=postgres://dummy:dummy@localhost:5432/dummy
ENV OPENAI_API_KEY=dummy
ENV ELEVENLABS_API_KEY=dummy
ENV RESEND_API_KEY=dummy
# Build the SvelteKit app
RUN pnpm build

# ---- Production Stage (Slim) ----
FROM node:20-alpine AS prod

WORKDIR /app

# Install pnpm and production dependencies
RUN npm install -g pnpm@10.10.0

# Copy package files
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-lock.yaml ./

# Install only production dependencies in the final stage
RUN pnpm install --prod --frozen-lockfile

# Copy the built application output (adapter-node creates 'build' directory)
COPY --from=build /app/build ./
COPY --from=build /app/static ./static

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
ENV PORT=3000
ENV HOST=0.0.0.0
# Workaround for node:sqlite error - app uses PostgreSQL, not SQLite
ENV NODE_OPTIONS="--no-warnings"

# Start the server using --env-file as recommended by SvelteKit
CMD ["node", "--env-file=.env", "index.js"]