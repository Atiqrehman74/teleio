Mobile build instructions

This repository includes a server and a Next.js site. To package the website as native apps we export the static site and use Capacitor to create native projects.

Prerequisites
- Node.js and npm installed
- Java + Android Studio for Android builds
- Xcode on macOS for iOS builds

Quick steps (Android):

1. From project root, install dependencies:

```bash
npm ci
```

2. Export the static site (outputs to `out`):

```bash
npm run export
```

3. Initialize Capacitor (only first time):

```bash
npm run cap:init
```

4. Add Android platform and sync:

```bash
npx cap add android
npm run cap:sync
```

5. Open Android Studio and build an APK:

```bash
npm run cap:open:android
```

For iOS (macOS only):

```bash
npx cap add ios
npm run cap:sync
npm run cap:open:ios
```

Notes
- iOS requires a Mac with Xcode.
- You can customize `capacitor.config.json` appId/appName.
- For PWAs and better native integration, consider adding a service worker and manifest.
