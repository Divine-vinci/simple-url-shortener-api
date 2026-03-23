FROM node:24-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json tsconfig.build.json drizzle.config.ts ./
COPY src ./src
COPY drizzle ./drizzle
RUN npm run build

FROM node:24-alpine AS production-deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && npm cache clean --force \
  && apk del python3 make g++

FROM node:24-alpine AS production
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    BASE_URL=http://localhost:3000 \
    DATABASE_PATH=./data/urls.db \
    LOG_LEVEL=info
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY package.json package-lock.json ./
RUN mkdir -p /app/data \
  && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
