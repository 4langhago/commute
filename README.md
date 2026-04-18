# Commute — Route Planner (PWA)

A React + TailwindCSS **installable web app** to plan commute routes, compare transport modes, and save favorite routes. Works offline after first load. Data persists in `localStorage`; no backend required.

## Features
- Plan a route between an origin and destination
- Pick a transport mode: Car, Transit, Bike, Walk
- View estimated time, distance, and cost
- Compare time across all modes at a glance
- Save routes with an optional nickname
- "Plan again" quick-action on any saved route
- Delete saved routes
- **Installable (PWA)** — add to Home Screen on iOS/Android, install as desktop app on Chrome/Edge
- **Offline support** via service worker (auto-update)

## Stack
- React 18 + Vite 5
- TailwindCSS 3
- Lucide icons
- `vite-plugin-pwa` (Workbox) for installable + offline
- `localStorage` for persistence

## Getting started (local)

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production bundle in dist/
npm run preview      # serve the built app locally (PWA works here)
```

> PWA features (install prompt, offline) only work in the **built** app served over HTTPS or `localhost`. Use `npm run preview` to test locally.

## Deploy to GitHub Pages

This repo includes a ready-to-use GitHub Actions workflow at `.github/workflows/deploy.yml`.

### One-time setup
1. Push this project to a **new GitHub repository** (e.g. `commute`).
2. On GitHub: **Settings → Pages → Build and deployment → Source = GitHub Actions**.
3. Push to the `main` branch. The workflow will build and publish automatically.
4. Your site will be live at `https://<username>.github.io/<repo-name>/`.

### How the base path works
- GitHub Actions sets `BASE_PATH=/<repo-name>/` during build.
- `vite.config.js` reads it and configures Vite's `base` so all asset URLs work under the subpath.
- **Exception:** if your repo is named `<username>.github.io`, edit the workflow and set `BASE_PATH: /` (user/organization site serves from root).

### Manual push-based alternative
If you prefer, you can also push the built `dist/` folder to a `gh-pages` branch (e.g. with the `gh-pages` npm package) — but the included Actions workflow is recommended.

## Installing as an app

- **iOS (Safari):** Share → *Add to Home Screen*
- **Android (Chrome):** menu → *Install app* / *Add to Home Screen*
- **Desktop (Chrome/Edge):** address bar install icon → *Install*

Once installed it launches in its own window (no browser chrome), uses the purple theme color, and works offline.

## Live data (optional upgrade)

Distance/time estimates are mocked deterministically in `src/modes.js` so no API key is needed. To use real data, replace `estimateDistanceKm` and `estimateMinutes` with calls to the Google Maps Directions API (or Mapbox, OpenRouteService, etc.) and store the key in a `.env` file as `VITE_MAPS_API_KEY=…`.

## Project structure

```
.
├── .github/workflows/deploy.yml   # GitHub Pages CI
├── public/                        # Static assets (icons, favicon)
├── scripts/gen-icons.ps1          # Regenerate PWA icons on Windows
├── src/
│   ├── components/                # RouteForm, RouteResult, SavedRouteCard
│   ├── modes.js                   # Transport modes + mock estimators
│   ├── App.jsx                    # Layout + state + save modal
│   ├── main.jsx                   # Entry + SW registration
│   └── index.css                  # Tailwind entry
├── index.html                     # PWA meta tags + icons
├── vite.config.js                 # base path + VitePWA plugin
└── tailwind.config.js
```

## Scripts
- `npm run dev` — start dev server
- `npm run build` — production build (outputs `dist/` including `sw.js` + `manifest.webmanifest`)
- `npm run preview` — preview built app (PWA features active)
