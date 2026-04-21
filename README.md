# Stormvault Courier Alpha

An early playable browser-game prototype built with Phaser, TypeScript, and Vite.

## Play Now

[Play Stormvault Courier Alpha](https://pigheadedpeak16.github.io/stormvault-courier-alpha/)

The link above opens the live game directly in the browser.

## Current Build

- Start from a proper title menu with `Play`, `Codex`, `Solar Systems`, and a `Tier 3` placeholder.
- Push deeper into each solar system for better-value orbs, then haul them back before the debris field becomes overwhelming.
- Spend `system points` from enemy drops on your current solar-system build.
- Buy expensive `permanent upgrades` in the contract bay between runs.
- Branch into Tier 2 ship classes such as `Twinframe`, `Longshot`, `Drone Bay`, and `Bulwark`.
- Learn enemy rosters and route themes through the in-game codex and solar-system browser.

## What Got Added

- Proper title screen flow instead of dropping straight into gameplay.
- Enemy codex with previews and descriptions.
- Solar-systems browser showing current route themes and enemy pools.
- Much harsher late-run enemy pressure with smoother countdown scaling.
- Stingier system-point drops and slower permanent progression.
- `Cruise Thrusters` moved into permanent upgrades.
- Mobile `Build` drawer so touch players can still spend system points.
- Extra regression tests for progression balance and enemy-scaling behavior.

## Controls

- `WASD`: move
- Mouse: aim
- Left click / `J`: fire
- `Space`: scan
- `E`: harvest / dock / extract
- `1-7`: spend available system-build points during the run

Touch controls also appear on small screens, including a `Build` drawer for spending system points.

## Next Build

- Complete the remaining ship tiers.
- Add more class-specific mechanics and deeper branch identities.
- Expand the progression and content further beyond the current alpha slice.

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
