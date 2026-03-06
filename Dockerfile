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

# Copy root workspace manifest + root tsconfig first (for layer caching).
# tsconfig.json MUST be here so packages/shared-types/tsconfig.json can
# resolve `extends: "../../tsconfig.json"` during the build-shared stage.
COPY package*.json ./
COPY tsconfig.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/backend/package.json            ./apps/backend/

# Install all workspace deps (includes shared-types resolution)
RUN npm install --legacy-peer-deps

RUN echo "[deps] node $(node -v) | npm $(npm -v) | root tsconfig: $(test -f tsconfig.json && echo OK || echo MISSING)"

# ── Stage 2: Build shared-types ───────────────────────────────────────────────
# deps stage already has tsconfig.json at /repo/tsconfig.json
FROM deps AS build-shared
COPY packages/shared-types ./packages/shared-types/
RUN echo "[build-shared] tsconfig.json present: $(test -f tsconfig.json && echo YES || echo NO — build will fail)"
# Run the shared-types build (tsc -b --force)
RUN cd packages/shared-types && npm run build
RUN echo "[build-shared] shared-types dist: $(ls packages/shared-types/dist 2>/dev/null || echo EMPTY)"

# ── Stage 3: Build backend ────────────────────────────────────────────────────
# tsconfig.json was already copied in deps stage, so no additional COPY needed.
FROM build-shared AS builder
COPY apps/backend/src      ./apps/backend/src/
COPY apps/backend/tsconfig.json ./apps/backend/tsconfig.json
RUN echo "[builder] compiling backend..."
RUN cd apps/backend && npm run build
RUN echo "[builder] backend dist: $(ls apps/backend/dist 2>/dev/null || echo EMPTY)"

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
