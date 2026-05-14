import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cordovaRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(cordovaRoot, '..', '..');
const webAppRoot = path.join(repoRoot, 'apps', 'web-app');
const distDir = path.join(webAppRoot, 'dist');
const wwwDir = path.join(cordovaRoot, 'www');

function copyDirectoryRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function ensureCordovaIndexCompatibility(indexPath) {
  let html = fs.readFileSync(indexPath, 'utf8');

  if (!html.includes('cordova.js')) {
    html = html.replace('</body>', '  <script src="cordova.js"></script>\n</body>');
  }

  if (!/Content-Security-Policy/i.test(html)) {
    const csp = [
      "default-src 'self' data: blob: https: http: ws: wss:",
      "img-src 'self' data: blob: https: http:",
      "style-src 'self' 'unsafe-inline' https:",
      "font-src 'self' data: https:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      "connect-src 'self' data: blob: https: http: ws: wss:",
      "media-src 'self' data: blob: https: http:",
      "frame-src 'self' https: http:",
    ].join('; ');
    html = html.replace('</head>', `  <meta http-equiv="Content-Security-Policy" content="${csp}">\n</head>`);
  }

  fs.writeFileSync(indexPath, html, 'utf8');
}

async function main() {
  console.log('[cordova] Building web app for Cordova...');
  const { spawnSync } = await import('node:child_process');
  const build = spawnSync('npm', ['run', 'build:cordova'], { cwd: webAppRoot, stdio: 'inherit', shell: true });
  if (build.status !== 0) {
    throw new Error(`Web build failed with code ${build.status}`);
  }

  if (!fs.existsSync(distDir)) {
    throw new Error(`Expected dist folder missing: ${distDir}`);
  }

  console.log('[cordova] Syncing dist -> cordova www...');
  fs.rmSync(wwwDir, { recursive: true, force: true });
  copyDirectoryRecursive(distDir, wwwDir);

  const indexPath = path.join(wwwDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Cordova index not found: ${indexPath}`);
  }
  ensureCordovaIndexCompatibility(indexPath);

  console.log('[cordova] Web assets prepared for Cordova successfully.');
}

main().catch((err) => {
  console.error('[cordova] prepare failed:', err.message || err);
  process.exit(1);
});
