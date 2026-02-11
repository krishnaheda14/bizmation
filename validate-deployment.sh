#!/bin/bash
# Deployment validation script
# Run this before pushing to ensure deployment will succeed

set -e

echo "🧪 Starting deployment validation..."
echo ""

# Check Node version
echo "1️⃣  Checking Node.js version..."
NODE_VERSION=$(node -v)
if [[ $NODE_VERSION == v20* ]]; then
    echo "   ✅ Node.js $NODE_VERSION (Required: v20.x)"
else
    echo "   ⚠️  Node.js $NODE_VERSION found. Cloudflare uses v20.x"
    echo "   Consider using: nvm use 20"
fi
echo ""

# Clean previous builds
echo "2️⃣  Cleaning previous builds..."
rm -rf apps/web-app/dist
rm -rf packages/shared-types/dist
rm -rf packages/sync-engine/dist
echo "   ✅ Clean complete"
echo ""

# Install dependencies
echo "3️⃣  Installing dependencies..."
npm ci --quiet
echo "   ✅ Dependencies installed"
echo ""

# Build shared-types
echo "4️⃣  Building shared-types package..."
npm run build --workspace=packages/shared-types --quiet
if [ -d "packages/shared-types/dist" ]; then
    echo "   ✅ shared-types built successfully"
else
    echo "   ❌ shared-types build failed"
    exit 1
fi
echo ""

# Build web-app
echo "5️⃣  Building web app..."
cd apps/web-app
npm ci --quiet
npm run build
cd ../..

if [ -d "apps/web-app/dist" ]; then
    echo "   ✅ Web app built successfully"
    
    # Check dist contents
    DIST_SIZE=$(du -sh apps/web-app/dist | cut -f1)
    FILE_COUNT=$(find apps/web-app/dist -type f | wc -l)
    echo "   📦 Build size: $DIST_SIZE"
    echo "   📄 Files: $FILE_COUNT"
    
    # Check for index.html
    if [ -f "apps/web-app/dist/index.html" ]; then
        echo "   ✅ index.html found"
    else
        echo "   ❌ index.html missing"
        exit 1
    fi
else
    echo "   ❌ Web app build failed"
    exit 1
fi
echo ""

# TypeScript check
echo "6️⃣  Running TypeScript validation..."
cd apps/web-app
npx tsc -p tsconfig.build.json --noEmit
cd ../..
echo "   ✅ No TypeScript errors"
echo ""

echo "✅ All validation checks passed!"
echo ""
echo "🚀 Ready to deploy to Cloudflare Pages"
echo ""
echo "Next steps:"
echo "  1. git add ."
echo "  2. git commit -m 'Ready for deployment'"
echo "  3. git push origin main"
echo "  4. Monitor deployment at https://dash.cloudflare.com"
