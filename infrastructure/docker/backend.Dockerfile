# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY apps/backend/package*.json ./
COPY packages/shared-types ../packages/shared-types

# Install dependencies
RUN npm install

# Copy source code
COPY apps/backend/src ./src
COPY apps/backend/tsconfig.json ./

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Start server
CMD ["node", "dist/server.js"]
