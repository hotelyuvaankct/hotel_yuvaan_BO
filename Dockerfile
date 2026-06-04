FROM node:18-alpine AS builder
WORKDIR /app

# allow build-time override for Vite env vars (e.g. VITE_API_BASE_URL, VITE_BASE)
ARG VITE_API_BASE_URL
ARG VITE_BASE
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_BASE=$VITE_BASE
ENV NODE_ENV=production

# copy lockfile and package manifest first for better caching
COPY package.json pnpm-lock.yaml ./
COPY .npmrc . || true

# copy the rest
COPY . .

# enable corepack and use pnpm to install and build
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile
RUN pnpm run build

FROM nginx:stable-alpine AS production

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Add SPA-friendly nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
