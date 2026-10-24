# Neon Reliquary

A high-performance digital companion for **Pathfinder 1st Edition** with a Neon Noir dark fantasy aesthetic. Built for both desktop and mobile, it automates combat mechanics, tracks resources, and provides a tactile 2D dice system.

## Features

- **Character management** — load characters from JSON, switch instantly between them
- **Status tab** — HP tracking, ability scores, AC, saves, and daily resource squares (Ki, Rage, Arcane Pool, etc.)
- **Combat tab** — weapon cards with automated attack/damage calculation, buff toggles (Power Attack, Deadly Aim, Rage), and prepared combat spells
- **Spells tab** — full spell library grouped by level with preparation tracking and arcane failure display
- **Features tab** — feats, class features, and special abilities
- **Dice system** — cryptographically random dice rolls with animated 2D overlay, crit detection, and a persistent roll log
- **Session persistence** — HP, spent resources, active buffs, conditions, and spell slots survive page reloads via localStorage and automatically sync across devices/sessions with **Neon Serverless Postgres** (`/api/sessions`)

## Cloud Database Setup (Neon Postgres on Vercel)

Character session state (`useSessionStore`: current HP, temp HP, nonlethal damage, spell slots, daily resources, buffs, conditions, coins, and inventory) syncs automatically with a **Neon Postgres** database while keeping optimistic 0ms local updates:

1. Open your project on **Vercel** → **Storage** (or **Marketplace**) → **Create Database** → select **Neon Postgres** and connect it to the project (this injects `DATABASE_URL` automatically).
2. Redeploy on Vercel (the `character_sessions` table is created automatically on first request).
3. *(Optional, for local dev)* Run `npx vercel env pull .env.local` (or add `DATABASE_URL=...` to `.env.local`) so `npm run dev` syncs with the same cloud database. Without `DATABASE_URL`, the app runs seamlessly in local-only mode.

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React 19 + Vite |
| Language | TypeScript (strict mode) |
| State | Zustand |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Persistence | localStorage (Zustand persist) + Dexie (IndexedDB) |
| Routing | React Router v7 |

## Getting Started

```bash
npm install
npm run dev       # Start dev server with HMR at http://localhost:5173
```

## Commands

```bash
npm run dev       # Start dev server
npm run build     # Type-check + production build
npm run lint      # ESLint across all .ts/.tsx files
npm run preview   # Serve the dist/ build locally
npx tsc --noEmit  # Type-check without building
```

## Adding a Character

1. Create a JSON file in `src/data/` matching the `FullCharacter` shape (see `src/store/useCharacterStore.ts`)
2. Import it in `CharacterSelectionPage.tsx`
3. Call `loadCharacter(data as unknown as FullCharacter)` in the seeding `useEffect`

Character JSON can be generated from a PCGen PDF export using the extraction pipeline in `pdf_characters/`.

## Project Structure

```
src/
├── components/     # Shared UI components (dice overlay, modals, etc.)
├── data/           # Character JSON files
├── lib/            # Pure logic: dice engine, combat calculations
├── pages/          # Route-level page components
└── store/          # Zustand stores (character, session, dice)
```

## Design Tokens

- **Primary** `#00daf3` — cyan, used for interactive/active states
- **Secondary** `#e9c349` — gold, used for headers and labels
- **Error** `#ffb4ab` — danger/nonlethal damage
- **Tertiary** `#c6c6c6` — muted/supporting text
- **Background** `#0a0a0f` — deep onyx
- **0px border-radius** everywhere by design — sharp corners only
