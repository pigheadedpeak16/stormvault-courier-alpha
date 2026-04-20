# Stormvault Courier Alpha

An early playable browser-game prototype built with Phaser, TypeScript, and Vite.

## What You Do

- Navigate storm sectors and scan for salvage.
- Harvest cargo caches while enemy drones close in.
- Manage heat, hull, cargo capacity, and a collapsing storm timer.
- Extract to bank credits, then buy permanent upgrades between runs.

## Controls

- `WASD` or arrow keys: move
- `Shift`: boost
- `Space`: scan
- `J` or left click: fire blaster
- `E` or `X`: harvest / dock / extract
- `F`: EMP pulse

Touch controls also appear on small screens for scan, pulse, harvest, fire, and boost.

## Run It

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open the local Vite URL shown in the terminal, usually `http://localhost:5173`.

## Publish On GitHub Pages

This project is prewired for GitHub Pages deployment through GitHub Actions.

1. Push the repo to GitHub on the `main` branch.
2. In the GitHub repo settings, enable Pages and choose `GitHub Actions` as the source.
3. Every push to `main` will build and deploy the latest version automatically.

## Build

```bash
npm run build
npm run preview
```
