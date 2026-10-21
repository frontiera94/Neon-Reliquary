# Project: Neon Reliquary — Tactical Architecture & Cyber Glassmorphism Redesign

## Architecture
Neon Reliquary is a Pathfinder 1e companion web application built with React 19, TypeScript, Zustand, and Tailwind CSS v4.
The architectural redesign transitions the application from isolated, fragmented navigation tabs to a unified tactical cockpit:
1. **State Tier**:
   - `useCharacterStore`: Immutable `FullCharacter` data (loaded from `src/data/*.json`).
   - `useSessionStore`: Dynamic `SessionState` keyed by `characterId` managing HP, temp HP, nonlethal damage, spent resources, active buffs, conditions, spent spell slots.
   - `useDiceStore`: Ephemeral modal roll lifecycle triggering 3D/animated dice in `DiceOverlayModal`.
   - `useUIStore` (or inspector state): Manages `inspectorDrawer` selection (`{ type: 'feat' | 'spell' | 'buff' | 'stat', id: string, title: string, content: ... }`) and view states.
2. **Rules & Calculations Engine** (`src/lib/stat-calc.ts`):
   - Pure, memoized calculation functions for effective ability scores, armor class (total/touch/flat-footed), saving throws (fort/ref/will), attack and damage bonuses, skills, and new helpers (`calcSpellDc`, `calcConcentrationBonus`, `resolveBuffResource`).
3. **Tactical UI Presentation Tier**:
   - `TacticalHUD`: Persistent top header across all views with reactive multi-track HP, quick-adjust popover, Total/Touch/Flat-Footed AC, clickable saving throws triggering `openRoll`, and active buff/condition pills.
   - `StatBreakdownTooltip`: Reusable glassmorphic tooltip/popover displaying calculation components color-coded with `#00f0ff` (bonus) and `#ff4b60` (penalty).
   - `ContextualCombatFeatures`: Combat-oriented feat/ability listing grouped by action economy (Standard, Swift, Move, Immediate, Full-Round) with inline resource tracking.
   - `InspectorDrawer`: Right slide-over glass drawer displaying full rule texts, formulas, and origins without page navigation.
   - `TacticalBentoGrid`: Responsive 3-column layout on viewports $\ge 1024\text{px}$ (Left: Vitals & Status, Center: Combat Actions & Buffs, Right: Grimoire, Features & Roll History), preserving mobile tabs on $< 1024\text{px}$.
   - Full Cyber Dark Glassmorphism compliance per `DESIGN.md` (`#0a0a12`, `#00f0ff`, `#d946ef`, `backdrop-blur-md`, `border-white/10`, `rounded-xl`, `rounded-2xl`).

---

## Feature Inventory
Every feature from user requirements and the Survey phase is mapped and assigned to a milestone:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Reactive HP Bar with Multi-track | Displays current, max, temp HP, and nonlethal damage with distinct visual tracks | M1 | R1 |
| 2 | Tactical HP Adjust Popover | Rapid popover to apply instant damage or healing (absorbing temp HP, healing nonlethal first) | M1 | R1 |
| 3 | Persistent AC Display | Total, Touch, and Flat-Footed AC badges visible in HUD with breakdown tooltips | M1 | R1 |
| 4 | Interactive Saving Throw Rolls | Fort, Ref, Will badges in HUD that call `useDiceStore.openRoll` with modifiers & breakdown | M1 | R1 |
| 5 | Compact Active Buff & Condition Pills | Horizontal scrollable pill bar in HUD showing active buffs and conditions with dismiss/inspect | M1 | R1 |
| 6 | Inline Resource Counters on Buffs | Pips/counters (Ki, Rage, Arcane Pool) embedded inside buff cards/toggles with spend/recover buttons | M2 | R2 |
| 7 | Inspectable Stat Breakdown Popover | Reusable popover/tooltip showing mathematical components of AC, Saves, and Attack/Damage | M2 | R2 |
| 8 | Chromatic Stat Alteration Highlighting | Dynamic cyan `#00f0ff` for positive bonuses and danger red `#ff4b60` for penalties in stat displays | M2 | R2 |
| 9 | Action Economy Classification | Taxonomy and helper (`action-economy.ts`) categorizing feats/abilities into Standard, Swift, Move, Immediate, Full-Round, Passive | M3 | R3 |
| 10 | Contextual Combat Abilities Widget | Dedicated combat panel section displaying usable combat feats with usage counters and quick actions | M3 | R3 |
| 11 | Defensive Badges & Reactions | Contextual chip badges for defensive abilities (e.g. Uncanny Dodge, Evasion, AC bonuses) next to AC and Saves | M3 | R3 |
| 12 | Lateral Inspector Drawer | Slide-out glass drawer displaying rich details, descriptions, and formulas for feats, spells, and buffs without losing context | M3 | R3 |
| 13 | Dynamic Spell DC & SR Display | Card and list display of calculated spell saving throw DC ($10 + \text{level} + \text{mod}$) and Spell Resistance indicators | M4 | R4 |
| 14 | Touch Attack & Concentration Quick Rolls | Direct action buttons on spell cards for contact attack rolls and Concentration / Caster Level checks | M4 | R4 |
| 15 | Duration Spell to Tactical Buff Link | Action button on duration-based spells spending the slot and toggling the corresponding tactical buff in combat/HUD | M4 | R4 |
| 16 | 3-Panel Tactical Bento Grid Layout | Desktop ($\ge 1024\text{px}$) unified dashboard: Left (Vitals/Status), Center (Combat/Actions), Right (Grimoire/Features/History) | M5 | R5 |
| 17 | Responsive Mobile Layout with HUD | Mobile ($< 1024\text{px}$) preservation of tab navigation paired with sticky Tactical HUD and drawer access | M5 | R5 |
| 18 | Cyber Dark Glassmorphism Realignment | Refactoring legacy 0px brutalist components (`CombatHPWidget`, `SummonSection`, `BuffManagerModal`, etc.) to smooth `rounded-xl`/`rounded-2xl` glass styling | M5 | R5 |
| 19 | Opaque-Box E2E Testing Suite | Comprehensive test suite covering Tiers 1-4 (Feature, Boundary, Combinations, Real-World Scenarios) | E2E-Track | Dual-Track |
| 20 | Final E2E Pass & Adversarial Hardening | 100% pass of E2E suite and Tier 5 white-box coverage hardening | M6 | Final |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Design test infrastructure (`TEST_INFRA.md`), runner, and Tiers 1-4 test suite; publish `TEST_READY.md` | none | PLANNED |
| M1 | Persistent Tactical HUD | Implement `TacticalHUD.tsx`, `TacticalHpPopover.tsx`, interactive saves with `useDiceStore`, AC badges, and active buff pills in `MainLayout.tsx` | none | PLANNED |
| M2 | Resource, Buff & Stat Breakdown Integration | Enhance buff toggles with resource pips (`useSessionStore`), build `StatBreakdownTooltip.tsx` with `#00f0ff`/`#ff4b60` styling for TxC/AC/Saves | M1 | PLANNED |
| M3 | Contextual Combat Features & Inspector Drawer | Implement `action-economy.ts`, `ContextualCombatFeatures.tsx`, defensive badges near AC/Saves, and `InspectorDrawer.tsx` | M1 | PLANNED |
| M4 | Spells & Tactical Buffs Linkage | Implement `calcSpellDc`, `calcConcentrationBonus`, touch attack actions, SR badges, and duration-to-buff toggles in `SpellsPage.tsx` and combat widgets | M2 | PLANNED |
| M5 | Responsive Bento Grid & Design System Realignment | Implement `TacticalBentoGrid.tsx` for desktop ($\ge 1024\text{px}$) with 3 columns, mobile tab fallback, and eliminate 0px brutalist styling | M1, M2, M3, M4 | PLANNED |
| M6 | Final Milestone: 100% E2E Pass & Adversarial Coverage | Verify 100% pass of Tiers 1-4 tests from `TEST_READY.md`, followed by Tier 5 adversarial coverage hardening | M5, E2E | PLANNED |

---

## Interface Contracts

### 1. `TacticalHUD` ↔ `useDiceStore` & `stat-calc.ts`
- **Location**: `src/components/layout/TacticalHUD.tsx`
- **Props**: none (subscribes to `useCharacterStore` and `useSessionStore`).
- **Events**:
  - `onRollSave(saveType: 'fort' | 'ref' | 'will')`: calls `useDiceStore.getState().openRoll({ diceType: 'd20', count: 1, modifier: effectiveSave.value, label: `${label} Save`, breakdown: effectiveSave.breakdown })`.
  - `onApplyDamage(damage: number)`: calls `useSessionStore.getState().applyDamage(characterId, damage)`.
  - `onApplyHealing(healing: number)`: calls `useSessionStore.getState().applyHealing(characterId, healing)`.

### 2. `StatBreakdownTooltip`
- **Location**: `src/components/ui/StatBreakdownTooltip.tsx`
- **Props**:
  ```ts
  interface StatBreakdownTooltipProps {
    title: string;
    total: number | string;
    breakdown: { label: string; value: number }[];
    notes?: string[];
    children: React.ReactNode;
    className?: string;
  }
  ```
- **Styling**: `backdrop-blur-md bg-surface-container/90 border border-white/10 rounded-xl p-3 shadow-2xl z-50`. Modifiers with `value > 0` render in text cyan (`#00f0ff`), `value < 0` in text red (`#ff4b60`).

### 3. `action-economy.ts` & Contextual Features
- **Location**: `src/lib/action-economy.ts`
- **Signatures**:
  ```ts
  export type ActionEconomyType = 'standard' | 'move' | 'swift' | 'immediate' | 'full-round' | 'passive';
  export interface CategorizedFeature {
    id: string;
    name: string;
    actionType: ActionEconomyType;
    shortDesc: string;
    fullDesc: string;
    resourceId?: string;
    remainingUses?: number;
    maxUses?: number;
    isDefensive?: boolean;
  }
  export function categorizeFeatures(character: FullCharacter, session: SessionState): CategorizedFeature[];
  ```

### 4. `InspectorDrawer` State
- **Location**: `src/store/useInspectorStore.ts` (or state slice)
- **Signatures**:
  ```ts
  export interface InspectorItem {
    type: 'feat' | 'spell' | 'buff' | 'weapon' | 'stat';
    id: string;
    title: string;
    subtitle?: string;
    description: string;
    breakdown?: { label: string; value: number }[];
    tags?: string[];
    actions?: { label: string; onClick: () => void }[];
  }
  export interface InspectorStore {
    isOpen: boolean;
    currentItem: InspectorItem | null;
    openInspector: (item: InspectorItem) => void;
    closeInspector: () => void;
  }
  ```

### 5. Spells & Buff Calculation Helpers
- **Location**: `src/lib/stat-calc.ts`
- **Signatures**:
  ```ts
  export function calcSpellDc(spellLevel: number, castingAbilityMod: number, schoolBonus: number = 0): number;
  export function calcConcentrationBonus(casterLevel: number, castingAbilityMod: number, featBonus: number = 0): number;
  export function getCastingAbilityKey(characterClass: string): AbilityKey;
  ```

---

## Code Layout
- `src/components/layout/TacticalHUD.tsx`: Persistent Tactical HUD header
- `src/components/layout/TacticalHpPopover.tsx`: Popover for rapid healing/damage with temp/nonlethal handling
- `src/components/ui/StatBreakdownTooltip.tsx`: Reusable breakdown tooltip with #00f0ff / #ff4b60 formatting
- `src/components/combat/BuffResourceToggle.tsx`: Buff toggle card with embedded resource pips and spend/recover controls
- `src/lib/action-economy.ts`: Taxonomy, keyword resolver, and feature classifier
- `src/components/combat/ContextualCombatFeatures.tsx`: Action economy grouped abilities for combat
- `src/components/ui/InspectorDrawer.tsx`: Slide-out glass drawer for rules, feats, spells, and stats
- `src/store/useInspectorStore.ts`: Zustand store for drawer state
- `src/components/layout/TacticalBentoGrid.tsx`: Desktop 3-panel dashboard container
- `src/components/layout/MainLayout.tsx`: Updated root layout integrating TacticalHUD, BentoGrid, and mobile tabs
- `src/lib/stat-calc.ts`: Extended with spell DC, concentration, and resource mapping helpers
- `tests/e2e/`: Opaque-box E2E test suites (Tiers 1-4)
