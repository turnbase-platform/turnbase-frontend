# Static bundle. Unlike turnbase-platform, the build runs inside the image: npm packages are
# all public (Astryx included), so there is no private-registry credential problem to avoid.
FROM node:22.23.2-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.31-alpine
# The base image lags Alpine's fixes (brotli-libs CVE-2026-111497, curl, libexpat); take the patched
# packages at build time. Drop this once the base catches up.
RUN apk upgrade --no-cache
COPY --from=build /app/dist /usr/share/nginx/html
# Rendered at start, not build: origins are deployment configuration (local-environment.md §7.7).
# The image's own step substitutes only TURNBASE_* variables, so nginx's `$host` and friends in the
# template are left alone. The .envsh is sourced by the entrypoint and must be executable.
ENV NGINX_ENVSUBST_FILTER=^TURNBASE_
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=755 nginx/15-derive-origins.envsh /docker-entrypoint.d/15-derive-origins.envsh

EXPOSE 8080
