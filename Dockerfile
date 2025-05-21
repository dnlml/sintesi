ARG OPENAI_API_KEY
ARG ELEVENLABS_API_KEY
# Install dependencies and build
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN corepack enable && corepack prepare pnpm@8.15.6 --activate
RUN pnpm install --frozen-lockfile
RUN echo "OPENAI_API_KEY=$OPENAI_API_KEY\nELEVENLABS_API_KEY=$ELEVENLABS_API_KEY" > .env
RUN pnpm run build

# Production image
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/build ./build
COPY --from=builder /app/.svelte-kit ./svelte-kit
COPY --from=builder /app/.env ./.env
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "build"]