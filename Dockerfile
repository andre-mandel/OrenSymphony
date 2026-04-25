# syntax=docker/dockerfile:1.7

# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# Install deps from lockfile for reproducible builds.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Build-time secrets are injected by Coolify as ARGs. Vite inlines
# GEMINI_API_KEY into the client bundle (see vite.config.ts), so
# this needs to be present during `npm run build`.
ARG GEMINI_API_KEY
ARG APP_URL
ENV GEMINI_API_KEY=${GEMINI_API_KEY}
ENV APP_URL=${APP_URL}

COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine AS runtime

# SPA-aware nginx config (history fallback to index.html, cache headers).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets.
COPY --from=build /app/dist /usr/share/nginx/html

# Coolify maps its own port; nginx listens on 80 inside the container.
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
