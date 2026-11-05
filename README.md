# Hiro Segawa Music Player

A functional, responsive music app using the original sakura-night artwork. React 19, TypeScript, Vite, Tailwind CSS v4, and the Web Audio API. The application entry point is `src/App.tsx`.

## Run

```sh
npm install
npm run dev
```

```sh
npm run build
npm run preview
```

## Download or Share

Use the white **Download Project as Zip File** button above the app preview, or use the app's download icon and choose **Download source ZIP**. The in-app exporter creates a ZIP directly in your browser; it does not navigate to a temporary `/downloads/` link.

Both exports are source projects. Extract the ZIP, open the folder containing `package.json`, and upload that folder's contents to GitHub. Do not upload only the unopened ZIP and expect GitHub to build it. Include the `src`, `public`, and `.github` folders.

All original artwork is checked in under `public/images`. Eight original demo instrumentals are generated locally on first playback from `src/player/demoAudio.ts`, so fresh downloads and Git clones do not depend on temporary WebP or MP3 files, Python packages, or a music server.

If your mobile browser blocks a download inside an embedded preview, use the platform's white download button or open the app preview in a new tab.

## Deploy From GitHub

**Vercel:** import your GitHub repository, choose Vite, use build command `npm run build`, and output directory `dist`.

**Netlify:** import the repository. The included `netlify.toml` sets the build command, Node version, and publish directory automatically.

**GitHub Pages:** upload the source, including `.github/workflows/deploy-pages.yml`, to the `main` branch. Open the repository's **Settings > Pages**, and set **Source** to **GitHub Actions**. The included workflow installs dependencies, checks TypeScript, builds, and deploys. Relative media paths and `--base=./` support repository subpaths such as `https://USERNAME.github.io/REPOSITORY/`.

Uploading source code to GitHub does not itself publish a website. You must enable GitHub Pages or connect a deployment service. The repository must have GitHub Pages available and allow Actions to run.

For local use, install Node.js 22 LTS, then run `npm ci` and `npm run dev`. Serve production files from a web server; do not open `dist/index.html` directly with a `file://` URL.

## Optional Release Archives

To generate fresh release ZIPs, run:

```sh
python3 scripts/package-release.py
```

- `releases/hiro-segawa-source.zip`: source code, artwork, local demo scores, package lockfile, setup instructions, and deployment workflow.
- `releases/hiro-segawa-deploy.zip`: a verified production build with portable asset paths. Extract and publish the contents to a static web host.

The archives exclude `node_modules`, Git history, credentials, local environment files, and test screenshots. Imported personal audio is kept in browser storage and is never included. Running the app, building, and deploying do not require Python. The optional command-line archive script uses only the Python standard library.

The built app includes its source text for the user-requested in-app ZIP exporter. It never exports environment files or personal browser storage. Generated command-line release archives are excluded by `.gitignore`.

## Features

- Eight locally synthesized original instrumental demos with real playback, seeking, volume, shuffle, repeat, queue editing, automatic track advancement, and a sleep timer.
- Local audio imports using file selection or drag and drop. Imported audio is persisted in IndexedDB; nothing is uploaded.
- Searchable music library with artist, album, and folder views, plus sorting and listening history.
- Persistent favorites and playlists, including creating, renaming, adding/removing songs, and deleting playlists.
- Seven-band Web Audio equalizer, presets, bass boost, spatial panning, and optional volume compression.
- Audio-reactive spectrum, sakura orbit, and vinyl visualizers.
- Eight persistent themes, optional sakura petals, reduced-motion support, and full-screen now playing.
- Local JSON backups for preferences, playlists, and favorites. Backups do not include audio files.
- Keyboard controls, browser media-session controls, semantic markup, focus-trapped dialogs, and accessible native range controls.

Local collections belong to the current browser and site origin. Clearing site data removes imported files and preferences. Codec support depends on the browser. Bundled tracks are instrumental; synced lyrics are not available for imported files.

## Verify

With the development server running:

```sh
npx playwright install --with-deps chromium
npx tsc --noEmit
node scripts/verify-app.mjs
node scripts/audit-accessibility.mjs
node scripts/verify-export.mjs
```

Tests exercise native audio playback and analyser data, seeking, repeat/shuffle, library search, playlist editing, favorites, IndexedDB audio imports, theme persistence, real equalizer filter gains, backups, settings, and layouts down to 320px. Screenshots are written to `artifacts/`.

Set `APP_URL` to test the production preview instead of the development server.

## Source

- `src/player/PlayerContext.tsx`: shared playback and collection state.
- `src/player/engine.ts`: Web Audio graph and sound processing.
- `src/player/storage.ts`: local preferences and IndexedDB audio storage.
- `src/player/views.tsx`: application screens.
- `src/player/layout.tsx`: sidebar, navigation, now playing, and playback dock.
- `src/player/components.tsx`: accessible controls and real-time visualizers.
- `src/player/dialogs.tsx`: playlist, track, queue, and shortcut dialogs.
- `src/index.css`: responsive visual system and motion preferences.

`scripts/verify-export.mjs` downloads a ZIP through the app, verifies its files, installs its locked dependencies, builds the extracted source, then tests artwork, playback, and another source export from a GitHub Pages-style subpath. This is a local deployment check; it does not publish to a GitHub account.
