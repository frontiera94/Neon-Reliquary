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

The test suite is powered by Vitest (`npm test`). Global setup in `src/test/setup.ts` provides storage mocks for Zustand stores. TypeScript strict mode is enabled with `noUnusedLocals` and `noUnusedParameters` — unused imports are a build error.

## Architecture

### State model — two stores, strict separation

**`useCharacterStore`** (persisted to `neon-characters` in localStorage) holds static character data: the full `FullCharacter` object (abilities, weapons, feats, spells, etc). This is write-once per session — loaded from JSON on first visit, never mutated during play.

**`useSessionStore`** (persisted to `neon-sessions` in localStorage) holds all mutable play state keyed by `characterId`: current HP, temp HP, nonlethal damage, spent resources, active buff IDs, conditions, prepared spells, spell slots, ammo, and `activeSummon`. Every action takes `characterId` as its first argument. Call `initSession(id, maxHp)` before first use — it is a no-op if the session already exists. `longRest(id, maxHp)` resets HP, temp HP, nonlethal, resources, spell slots, buffs, conditions, and the active summon in one call.

**`useDiceStore`** (not persisted) manages dice overlay lifecycle: `openRoll(DiceRoll)` → animation plays → `setResult(RollResult)` auto-fires after 1.2s via `DiceOverlayModal`'s `useEffect`. `setResult` prepends each roll to `history` (capped at 50); call `clearHistory()` to wipe it. `DiceOverlayModal` handles critical-threat confirmation in-place — a "Confirm Critical" button re-rolls and sets `critConfirmed` to show a hit/miss badge.

### Data flow for combat calculations

`CombatPage` calls `calcEffectiveWeapon(weapon, char.buffs, session.activeBuffIds)` from `src/lib/combat-calc.ts` to derive display values. Buff modifiers live on the `BuffToggle` objects in `FullCharacter.buffs`; active state lives in `SessionState.activeBuffIds`. The two are joined at render time — never precomputed.

### `FullCharacter` is the central type

Defined in `src/store/useCharacterStore.ts` (not in `src/types/`), it extends the base `Character` type with all domain arrays. Sample data JSON files in `src/data/` must match this shape and are cast with `as unknown as FullCharacter` on load. When adding new character fields, update both the type and both JSON files.

### Routing

`/characters` renders `CharacterSelectionPage` outside `MainLayout` (full-screen, no sidebar). All other routes (`/status`, `/skills`, `/combat`, `/spells`, `/features`) render inside `MainLayout` via `<Outlet>`. Unknown paths redirect to `/characters`.

### Design system constraints (Impeccable Cyber Glass)

- **Dark Cyber Glass aesthetic** — Follows Impeccable guidelines (`impeccable.style/antipattern-examples/lazy-cool`): deep dark background (`#0a0a12`), electric cyan (`#00f0ff` / `#00daf3`) for primary CTA and glow accents, electric magenta (`#d946ef`) for secondary cyber accents, crisp white (`#f1f5f9` / `#ffffff`) for titles and primary text. Yellow/gold is eradicated except for realistic gold coins (`gp`) in the CoinPurse widget (`text-amber-400`).
- **Smooth Geometry & Hierarchy** — Replaces rigid 0px brutalism with smooth rounded geometry: `rounded-xl` (buttons, chips, inputs), `rounded-2xl` (cards, bento items, modals), `rounded-3xl` (hero containers, large overlays), and `rounded-full` (pills, status badges, circular icons).
- **Glassmorphism & Depth** — Panels use subtle alpha surfaces (`bg-surface-container/70` or `bg-[#121424]/60`), `backdrop-blur-md` or `backdrop-blur-xl`, with refined 1px translucent borders (`border-white/10` or `border-white/5`).
- **Atmospheric Lighting** — Layout incorporates dual ambient glow orbs (`.glow-orb`) with cyan top-right and magenta bottom-left at low opacity (15-20%) with deep blur (`blur-[140px]`), preventing flat dark voids without washing out content contrast.
- **Typography & Accessibility** — WCAG AA compliant contrast (≥4.5:1 text, ≥3:1 large headers). Font stacks: `font-headline` (Noto Serif), `font-body` (Inter / Manrope), `font-label` (JetBrains Mono / Space Grotesk).
- **Interactive States** — Interactive controls use directional hover glow (`hover:shadow-[0_0_20px_rgba(0,240,255,0.25)]`), smooth transitions, and tactile active states (`active:scale-95`).

### TopBar and SettingsPanel

`TopBar` (`src/components/layout/TopBar.tsx`) is sticky (`z-50`) and shows the character name/class, a live HP gradient bar, active conditions, a Character Switcher button, and a settings gear that opens `SettingsPanel`. `SettingsPanel` (`src/components/layout/SettingsPanel.tsx`) slides in from the right at `z-[45]` (below TopBar) and displays the full roll history with a clear button.

### CombatPage features

Beyond buff toggles and weapon cards, `CombatPage` now supports:
- **Two-Weapon Fighting** — detects `isTwf` buff and the TWF feat to show an off-hand attack button with the correct penalty (-2 with feat, -4 without).
- **Extra damage dice** — detects a buff with `extraDamageDice` (e.g. Sneak Attack) and adds a separate roll button per weapon card.
- **Ammo tracking** — ranged weapons with `maxAmmo` show a pip tracker; state lives in `SessionState.ammo`.
- **Summon Nature's Ally** — spells with `summonOptions` surface a tabbed picker. Selecting a creature writes an `ActiveSummon` to session; `SummonedCreaturePanel` shows its HP tracker and clickable attack/damage roll buttons. Dismiss clears the summon.

### Dice system

`src/lib/dice-engine.ts` uses `crypto.getRandomValues` for randomness. `rollDice(DiceRoll)` returns a `RollResult` with formula string, crit detection (first die ≥ `critRange`), and UUID. The overlay in `DiceOverlayModal` handles the 1.2s animation delay internally — callers just call `useDiceStore.openRoll(roll)`.

### Adding a new character

Create a JSON file in `src/data/` matching the `FullCharacter` shape, import it in `CharacterSelectionPage.tsx`, and call `loadCharacter(data as unknown as FullCharacter)` in the `useEffect` that seeds the store.
