# Deployment validation script for Windows
# Run this before pushing to ensure deployment will succeed

Write-Host "🧪 Starting deployment validation...`n" -ForegroundColor Cyan

# Check Node version
Write-Host "1️⃣  Checking Node.js version..." -ForegroundColor Yellow
$nodeVersion = node -v
if ($nodeVersion -like "v20*") {
    Write-Host "   ✅ Node.js $nodeVersion (Required: v20.x)" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Node.js $nodeVersion found. Cloudflare uses v20.x" -ForegroundColor Yellow
    Write-Host "   Consider using: nvm use 20" -ForegroundColor Gray
}
Write-Host ""

# Clean previous builds
Write-Host "2️⃣  Cleaning previous builds..." -ForegroundColor Yellow
Remove-Item -Path "apps\web-app\dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "packages\shared-types\dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "packages\sync-engine\dist" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "   ✅ Clean complete" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "3️⃣  Installing dependencies..." -ForegroundColor Yellow
npm ci --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "   ❌ Dependency installation failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Build shared-types
Write-Host "4️⃣  Building shared-types package..." -ForegroundColor Yellow
npm run build --workspace=packages/shared-types --quiet
if (Test-Path "packages\shared-types\dist") {
    Write-Host "   ✅ shared-types built successfully" -ForegroundColor Green
} else {
    Write-Host "   ❌ shared-types build failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Build web-app
Write-Host "5️⃣  Building web app..." -ForegroundColor Yellow
Set-Location apps\web-app
npm ci --quiet
npm run build
Set-Location ..\..

if (Test-Path "apps\web-app\dist") {
    Write-Host "   ✅ Web app built successfully" -ForegroundColor Green
    
    # Check dist contents
    $distSize = (Get-ChildItem -Path apps\web-app\dist -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    $fileCount = (Get-ChildItem -Path apps\web-app\dist -Recurse -File).Count
    Write-Host "   📦 Build size: $([math]::Round($distSize, 2)) MB" -ForegroundColor Cyan
    Write-Host "   📄 Files: $fileCount" -ForegroundColor Cyan
    
    # Check for index.html
    if (Test-Path "apps\web-app\dist\index.html") {
        Write-Host "   ✅ index.html found" -ForegroundColor Green
    } else {
        Write-Host "   ❌ index.html missing" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   ❌ Web app build failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# TypeScript check
Write-Host "6️⃣  Running TypeScript validation..." -ForegroundColor Yellow
Set-Location apps\web-app
npx tsc -p tsconfig.build.json --noEmit
Set-Location ..\..
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ No TypeScript errors" -ForegroundColor Green
} else {
    Write-Host "   ❌ TypeScript validation failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "✅ All validation checks passed!`n" -ForegroundColor Green
Write-Host "🚀 Ready to deploy to Cloudflare Pages`n" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. git add ." -ForegroundColor Gray
Write-Host "  2. git commit -m 'Ready for deployment'" -ForegroundColor Gray
Write-Host "  3. git push origin main" -ForegroundColor Gray
Write-Host "  4. Monitor deployment at https://dash.cloudflare.com" -ForegroundColor Gray
