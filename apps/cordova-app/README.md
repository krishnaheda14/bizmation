# Bizmation Cordova App

This folder wraps the web app (`apps/web-app`) into an Apache Cordova mobile app.

## What Is Configured

- Cordova project config in `config.xml`
- Required plugins for app navigation/network behavior
- Automated web build sync into Cordova `www/`
- Cordova-compatible web build mode (`vite --mode cordova`)
- CSP and `cordova.js` auto-injection during asset sync

## One-Time Setup

Run from repo root:

```bash
npm install
npm install -w apps/cordova-app
npm run platform:add:android -w apps/cordova-app
# Optional (macOS only):
npm run platform:add:ios -w apps/cordova-app
npm run plugin:add -w apps/cordova-app
```

## Build Flow

### Prepare web assets for Cordova

```bash
npm run cordova:prepare
```

This does:

1. Builds web app in Cordova mode (`build:cordova`).
2. Copies `apps/web-app/dist` to `apps/cordova-app/www`.
3. Ensures `cordova.js` is injected in `www/index.html`.
4. Adds a Cordova-safe CSP meta tag if missing.

### Build Android app

```bash
npm run cordova:build:android
```

### Build iOS app

```bash
npm run cordova:build:ios
```

## Run on Device/Emulator

```bash
npm run cordova:run:android
# or
npm run cordova:run:ios
```

## Update Strategy

Current setup uses **bundled web assets**.

- Any web changes are included by rerunning:
  - `npm run cordova:prepare`
  - then `npm run cordova:build:android` / `npm run cordova:build:ios`
- This is the most stable and review-friendly release flow.

If you need instant OTA-style updates, host web assets remotely and load from a remote `content src` with strict domain allowlists. That requires an additional security review and controlled rollback mechanism.

## Important Notes

- Hash routing is already used in the web app, so deep links work correctly under Cordova file/webview contexts.
- Cordova build mode disables PWA service worker plugin to avoid webview caching conflicts.
- Keep API endpoints HTTPS and reachable from mobile networks.
