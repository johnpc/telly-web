# telly-web — static build served by nginx. No backend: the browser fetches the
# user's playlist/EPG directly, so this image only ships HTML/JS/CSS.
# The build stage is pinned to the BUILD platform: `dist/` is identical for every
# architecture, and running npm/Vite under QEMU for the arm64 half turned a
# dependency change into a 20+ minute build (2026-11-23). Only the nginx stage
# is multi-arch.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
ARG VITE_APP_VERSION=docker
ENV VITE_APP_VERSION=$VITE_APP_VERSION
RUN npx vite build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
