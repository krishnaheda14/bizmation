#!/bin/bash
# Cloudflare Pages build script

set -e

echo "📦 Installing root dependencies..."
npm ci

echo "🔨 Building shared-types package..."
npm run build --workspace=packages/shared-types

echo "🚀 Building web app..."
cd apps/web-app
npm ci
npm run build

echo "✅ Build complete! Output in apps/web-app/dist"
