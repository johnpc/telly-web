# telly-web — static build served by nginx. No backend: the browser fetches the
# user's playlist/EPG directly, so this image only ships HTML/JS/CSS.
FROM node:22-alpine AS build
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
