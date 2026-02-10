# Web App Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY apps/web-app/package*.json ./
COPY packages/shared-types ../packages/shared-types
COPY packages/sync-engine ../packages/sync-engine

# Install dependencies
RUN npm install

# Copy source code
COPY apps/web-app/ ./

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY infrastructure/docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
