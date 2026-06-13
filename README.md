# FreakFight Arcade

**Describe two ridiculous fighters. Watch them battle. Get a shareable battle story.**

A V1 proof-of-concept arcade fighting game. You write what each fighter looks
like and what powers it has; the game turns each description into a low-poly 3D
fighter and auto-battles them in **The Neon Pit**. No accounts, no backend, no
payments — just the core loop.

> e.g. *"a radioactive toaster with crab claws"* vs *"a void dragon made of
> purple smoke"* → a believable fight → *"Voidweave kept its distance and
> punished Meloncoil's close-range attacks, then landed Forcefield Collapse…"*

## Play it on your phone

Once GitHub Pages is enabled (see below), the game is live at:

**https://asule.github.io/BeastModeOn-Game/**

Open that on your phone — it's a fully client-side web app, mobile-first.

### One-time setup to enable Pages (must be done in the GitHub UI)

1. Push this branch (the deploy workflow runs on `main` and
   `claude/compassionate-tesla-oluspe`).
2. In the repo on GitHub: **Settings → Pages → Build and deployment → Source:
   GitHub Actions**.
3. If the deploy is blocked because the `github-pages` environment only allows
   the default branch, either merge this branch into `main`, or
   **Settings → Environments → github-pages → Deployment branches** and allow
   `claude/compassionate-tesla-oluspe`.

The "Deploy to GitHub Pages" workflow will then publish the site on every push.

## Run / develop locally

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm run build    # production build into dist/ (uses the /BeastModeOn-Game/ base)
npm run preview  # serve the production build locally
npm run test     # unit tests for the battle engine + fighter generator
```

### Continue this project on your laptop later

Everything lives in this Git repo — nothing is tied to the cloud session it was
built in. To pick it up on your own machine:

```bash
git clone https://github.com/asule/BeastModeOn-Game.git
cd BeastModeOn-Game
git checkout claude/compassionate-tesla-oluspe
npm install
npm run dev
```

`node_modules` is git-ignored and rebuilt from `package.json`, so the project is
fully reproducible.

## How it works

- **Fighter generation** — by default a local, deterministic generator turns your
  text into a fully valid fighter (archetype, body parts, powers, stats, colors,
  scouting report). Zero API key, always works, instant. Optionally, in
  **⚙ Settings** you can paste your own Anthropic API key to use **Claude Haiku**
  for richer fighters; it silently falls back to the local generator on any error.
- **Battle engine** (`src/engine/battle.ts`) — a deterministic, seeded, tick-based
  simulation (behavior states, counter matchups, damage logic) that produces a
  replayable event log and a winner. Unit-tested for determinism.
- **3D layer** (`src/three/`) — React Three Fiber renders the arena and fighters
  from primitive geometry, then *replays* the event log with procedural
  animation (lunges, hit shake, knockback, particles, auto camera).
- **Battle story** (`src/engine/story.ts`) — turns the event log into a vivid,
  shareable recap, surfaced on the winner screen with a Copy/Share button.

## Tech stack

React · TypeScript · Vite · Tailwind · Zustand · Three.js · React Three Fiber ·
Vitest. 100% static / client-side.

## Project structure

```
src/
  generation/   local + optional-LLM fighter generation
  engine/       seeded RNG, battle simulation, story generator (+ tests)
  three/        Arena, Fighter3D, BattleScene (replay), Particles
  screens/      Title, Create, Generating, Preview, Battle, Winner, Settings
  store.ts      Zustand game state
```
