# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Vite HMR)
npm run build      # Type-check then production build (tsc -b && vite build)
npm run lint       # ESLint across all .ts/.tsx files
npm run preview    # Serve the dist/ build locally
npx tsc --noEmit   # Type-check without building
```

There are no tests yet. TypeScript strict mode is enabled with `noUnusedLocals` and `noUnusedParameters` — unused imports are a build error.

## Architecture

### State model — two stores, strict separation

**`useCharacterStore`** (persisted to `neon-characters` in localStorage) holds static character data: the full `FullCharacter` object (abilities, weapons, feats, spells, etc). This is write-once per session — loaded from JSON on first visit, never mutated during play.

**`useSessionStore`** (persisted to `neon-sessions` in localStorage) holds all mutable play state keyed by `characterId`: current HP, spent resources, active buff IDs, conditions, prepared spells, spell slots, ammo. Every action takes `characterId` as its first argument. Call `initSession(id, maxHp)` before first use — it is a no-op if the session already exists.

**`useDiceStore`** (not persisted) manages dice overlay lifecycle: `openRoll(DiceRoll)` → animation plays → `setResult(RollResult)` auto-fires after 1.2s via `DiceOverlayModal`'s `useEffect`.

### Data flow for combat calculations

`CombatPage` calls `calcEffectiveWeapon(weapon, char.buffs, session.activeBuffIds)` from `src/lib/combat-calc.ts` to derive display values. Buff modifiers live on the `BuffToggle` objects in `FullCharacter.buffs`; active state lives in `SessionState.activeBuffIds`. The two are joined at render time — never precomputed.

### `FullCharacter` is the central type

Defined in `src/store/useCharacterStore.ts` (not in `src/types/`), it extends the base `Character` type with all domain arrays. Sample data JSON files in `src/data/` must match this shape and are cast with `as unknown as FullCharacter` on load. When adding new character fields, update both the type and both JSON files.

### Routing

`/characters` renders `CharacterSelectionPage` outside `MainLayout` (full-screen, no sidebar). All other routes (`/status`, `/skills`, `/combat`, `/spells`, `/features`) render inside `MainLayout` via `<Outlet>`. Unknown paths redirect to `/characters`.

### Design system constraints

- **0px border-radius everywhere** — `rounded-*` classes produce sharp corners by design. `rounded-full` is the only exception (for circular elements).
- **No 1px borders for layout separation** — use background-color shifts between surface tiers (`surface` → `surface-container` → `surface-container-high` → `surface-container-highest`).
- Tailwind color tokens map to the full Material You palette in `tailwind.config.ts`. Use `primary` (#00daf3 cyan) for interactive/active states, `secondary` (#e9c349 gold) for headers/labels, `error` (#ffb4ab) for danger/nonlethal, `tertiary` (#c6c6c6) for muted text.
- Font families: `font-headline` (Noto Serif) for titles, `font-body` (Manrope) for prose, `font-label` (Space Grotesk) for numbers and UI labels.
- Interactive elements get a cyan glow on hover: `hover:shadow-[0_0_20px_rgba(0,218,243,0.3)]`.

### Dice system

`src/lib/dice-engine.ts` uses `crypto.getRandomValues` for randomness. `rollDice(DiceRoll)` returns a `RollResult` with formula string, crit detection (first die ≥ `critRange`), and UUID. The overlay in `DiceOverlayModal` handles the 1.2s animation delay internally — callers just call `useDiceStore.openRoll(roll)`.

### Adding a new character

Create a JSON file in `src/data/` matching the `FullCharacter` shape, import it in `CharacterSelectionPage.tsx`, and call `loadCharacter(data as unknown as FullCharacter)` in the `useEffect` that seeds the store.
