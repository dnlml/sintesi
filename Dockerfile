FROM node:22-alpine

WORKDIR /app

COPY . .

RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
RUN pnpm install --prod

CMD ["node", "build/index.js"]

EXPOSE 3000