# ─────────────────────────────────────────────────────────────────────────────
# Bizmation Backend — Production Dockerfile
#
# Build context: REPO ROOT (not apps/backend)
# Used by: Railway deployment
#
# Build stages:
#   1. deps      – install all workspace node_modules
#   2. builder   – compile shared-types + backend TypeScript
#   3. production – lean image with only compiled dist + prod deps
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Install all workspace dependencies ───────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /repo

# Copy root workspace manifest first (for layer caching)
COPY package*.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/backend/package.json            ./apps/backend/

# Install all workspace deps (includes shared-types resolution)
RUN npm install --legacy-peer-deps

# ── Stage 2: Build shared-types ───────────────────────────────────────────────
FROM deps AS build-shared
COPY packages/shared-types ./packages/shared-types/
# Run the shared-types build (tsc -b --force)
RUN cd packages/shared-types && npm run build

# ── Stage 3: Build backend ────────────────────────────────────────────────────
FROM build-shared AS builder
COPY tsconfig.json         ./tsconfig.json
COPY apps/backend/src      ./apps/backend/src/
COPY apps/backend/tsconfig.json ./apps/backend/tsconfig.json

RUN cd apps/backend && npm run build

# ── Stage 4: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Copy only the compiled backend output
COPY --from=builder /repo/apps/backend/dist      ./dist
COPY --from=builder /repo/apps/backend/package*.json ./
COPY --from=builder /repo/node_modules           ./node_modules
COPY --from=builder /repo/packages/shared-types/dist ./node_modules/@jewelry-platform/shared-types/dist
COPY --from=builder /repo/packages/shared-types/package.json ./node_modules/@jewelry-platform/shared-types/package.json

EXPOSE 3000
CMD ["node", "dist/server.js"]
