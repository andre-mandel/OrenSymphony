# syntax=docker/dockerfile:1.7

# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# Native build deps for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build:web

# Drop dev deps after building the SPA so the runtime image is lean.
RUN npm prune --omit=dev

# ---------- Runtime stage ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80
ENV DATA_DIR=/app/data

# tini for clean signal handling
RUN apk add --no-cache tini wget

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/package.json ./package.json

RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1/api/health >/dev/null || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--import", "tsx/esm", "server/index.ts"]
