# TEST_INFRA.md — Neon Reliquary E2E Test Infrastructure

## 1. Test Philosophy

Neon Reliquary's testing strategy adheres to strict **opaque-box, requirement-driven verification**:
- **Opaque-Box Testing**: Tests interact with the application through its observable public interfaces: DOM elements, user interactions (clicks, inputs, toggles), Zustand state subscriptions (`useSessionStore`, `useCharacterStore`, `useDiceStore`), and deterministic Pathfinder 1e mathematical engines (`src/lib/stat-calc.ts`, `src/lib/dice-engine.ts`). Tests do not couple to unexported internal implementation details.
- **Requirement-Driven**: Every assertion maps directly to functional requirements R1–R5 defined in `ORIGINAL_REQUEST.md`, architectural contracts in `PROJECT.md`, and design tokens in `DESIGN.md`.
- **Expected Output Derivation**: Expected numerical outputs (AC totals, touch AC, flat-footed AC, saving throws, attack bonuses, spell DCs, concentration checks, and damage absorption) are strictly derived from official Pathfinder 1e System Reference Document (SRD) rules and documented specifications in `PROJECT.md` § Interface Contracts.
- **Test Independence**: Each test case is fully isolated and self-contained. `beforeEach` resets Zustand stores to known states (`useCharacterStore.setState`, `useSessionStore.setState`, `useDiceStore.setState`) and cleans up DOM fixtures.
- **Progressive Testability & Dual-Track Verification**: The test suite serves as the executable contract for ongoing and upcoming implementation milestones (M1–M5), verifying both existing core behavior and contract compliance for new tactical components.

---

## 2. Test Architecture

### 2.1 Framework and Tools
- **Test Runner**: Vitest v4.1.4
- **DOM Environment**: JSDOM v29 via `// @vitest-environment jsdom` directive on all UI test files
- **Testing Libraries**:
  - `@testing-library/react` (v16.3.3) for component rendering and querying
  - `@testing-library/user-event` (v14.6.7) and `@testing-library/react` `fireEvent` for user interaction simulation
  - `@testing-library/jest-dom/vitest` for DOM assertions (`toBeInTheDocument`, `toHaveClass`, `toHaveTextContent`)
- **Setup & Polyfills**: `src/test/setup.ts` provides:
  - In-memory `localStorage` and `sessionStorage` (`MemoryStorage`)
  - `window.matchMedia` mock
  - `window.ResizeObserver` mock
  - `Element.prototype.scrollIntoView` polyfill
  - Automatic `cleanup()` in `afterEach()`

### 2.2 Test Suite Tier Structure (`tests/e2e/`)

```
tests/e2e/
├── tier1-features.test.tsx      # Tier 1: Feature Coverage across R1–R5 (>=5 tests per feature)
├── tier2-boundaries.test.tsx    # Tier 2: Boundary & Corner Cases (>=5 tests per boundary)
├── tier3-interactions.test.tsx  # Tier 3: Pairwise & Cross-Feature Interactions
└── tier4-workloads.test.tsx     # Tier 4: Realistic Real-World Application Scenarios
```

### 2.3 Execution Commands

- **Run E2E Test Suites**:
  ```bash
  npm test -- tests/e2e/
  # or
  npx vitest run tests/e2e/
  ```
- **Run Entire Test Suite (Unit + E2E)**:
  ```bash
  npm test
  ```
- **Type-Check All Tests & Source**:
  ```bash
  npx tsc --noEmit
  ```
- **Production Build Integrity**:
  ```bash
  npm run build
  ```

---

## 3. Feature Inventory Coverage Mapping

| Req | Feature | Scope & Specification | Target Test Suite | Minimum Tests |
|---|---|---|---|---|
| **R1** | Reactive HP Bar (Multi-track) | Current, max, temp HP, nonlethal damage with fill bar and fractions | `tier1-features.test.tsx` | $\ge 5$ |
| **R1** | Tactical HP Popover | Quick-adjust instant damage & cure, absorbing temp HP, healing nonlethal first | `tier1-features.test.tsx` | $\ge 5$ |
| **R1** | Persistent AC Display | Total, Touch, Flat-Footed badges with tooltip breakdown | `tier1-features.test.tsx` | $\ge 5$ |
| **R1** | Saving Throw Rollers | Fort, Ref, Will badges triggering `useDiceStore.openRoll` with modifiers | `tier1-features.test.tsx` | $\ge 5$ |
| **R1** | Buff & Condition Pills | Compact horizontal strip of active buffs and conditions | `tier1-features.test.tsx` | $\ge 5$ |
| **R2** | Inline Resource Pips | Ki, Rage, Arcane Pool counters on buff toggles with spend/recover buttons | `tier1-features.test.tsx` | $\ge 5$ |
| **R2** | Stat Breakdown Tooltip | Reusable popover showing Base, Ability, Buff, Condition components | `tier1-features.test.tsx` | $\ge 5$ |
| **R2** | Semantic Color Highlighting | `#00f0ff` cyan for positive bonuses, `#ff4b60` red for penalties | `tier1-features.test.tsx` | $\ge 5$ |
| **R3** | Action Economy Taxonomy | Standard, Swift, Move, Immediate, Defensive, Passive categorization | `tier1-features.test.tsx` | $\ge 5$ |
| **R3** | Contextual Combat Features | Combat-usable feats displayed in combat area with usage counters | `tier1-features.test.tsx` | $\ge 5$ |
| **R3** | Defensive Badges & Reactions | Evasion, Uncanny Dodge, energy resistances adjacent to AC/Saves | `tier1-features.test.tsx` | $\ge 5$ |
| **R3** | Lateral Inspector Drawer | Slide-out panel for full feat, spell, or stat mechanics without page reload | `tier1-features.test.tsx` | $\ge 5$ |
| **R4** | Spell Save DC & SR Display | Calculated DC ($10 + \text{level} + \text{mod}$) and SR indicator | `tier1-features.test.tsx` | $\ge 5$ |
| **R4** | Concentration & Touch Rolls | Quick action buttons for Concentration check and Contact attack rolls | `tier1-features.test.tsx` | $\ge 5$ |
| **R4** | Duration Spell-to-Buff Link | Spending slot activates spell as active buff in HUD and Combat view | `tier1-features.test.tsx` | $\ge 5$ |
| **R5** | 3-Panel Bento Grid | Unified desktop ($\ge 1024\text{px}$) layout (Vitals, Combat, Grimoire/Features) | `tier1-features.test.tsx` | $\ge 5$ |
| **R5** | Mobile Responsive Layout | Viewports $< 1024\text{px}$ maintain bottom tabs + sticky HUD | `tier1-features.test.tsx` | $\ge 5$ |
| **R5** | Cyber Dark Glassmorphism | `backdrop-blur-md`, `border-white/10`, `rounded-xl`/`rounded-2xl`, zero brutalism | `tier1-features.test.tsx` | $\ge 5$ |

---

## 4. Boundary & Corner Cases (Tier 2 Mapping)

| # | Boundary Condition | Edge Scenario | Verification Method |
|---|---|---|---|
| **B1** | 0 HP Clamping & Dying State | HP drops to exact 0 (disabled) or negative (dying/dead) | Verify bar width clamps to 0%, negative value shown, alert styling |
| **B2** | Massive Damage Overflow | Damage > `tempHp + currentHp` | Temp HP fully depleted to 0, overflow deducted from current HP |
| **B3** | Nonlethal Consciousness Thresholds | `nonlethal == currentHp` (staggered) and `nonlethal > currentHp` (unconscious) | Status flags and danger color tokens applied |
| **B4** | Negative Ability Modifiers | Ability score $< 10$ (e.g. STR 6 $\to$ mod -2) | Negative mod correctly reduces attack/damage and saves; negative DEX penalizes Flat-Footed AC |
| **B5** | Resource Depletion & Capping | Resource spent reaches max limit | Further spending disabled, recover button restores count |
| **B6** | Spell Slot Exhaustion | Last slot spent for a given level | Slot buttons disabled or flagged spent, recovery restore |
| **B7** | Missing Optional Fields | Spells/feats missing subschool, savingThrow, damageBonus | Components render gracefully without NaN or runtime exceptions |
| **B8** | Ephemeral Dice History Cap | >50 rolls dispatched to `useDiceStore` | History strictly capped at 50, oldest entries dropped, order preserved |
| **B9** | Viewport Breakpoint Resize | Boundary crossing at exactly 1024px | 1023px renders mobile tab layout; 1024px renders 3-column bento layout without state loss |

---

## 5. Cross-Feature Interactions (Tier 3 Mapping)

1. **Spell-to-Buff $\to$ AC & Saves $\to$ Tactical HUD**:
   - Spending a 1st-level slot casts *Shield* $\to$ activates $+4$ shield AC buff $\to$ Tactical HUD Total and Flat-Footed AC increase by $+4$ (Touch AC unchanged) $\to$ Stat breakdown tooltip reflects `Shield: +4`.
2. **Condition $\to$ Ability Modifier $\to$ Saving Throw Roll**:
   - Applying `fatigued` condition $\to$ reduces STR and DEX by $-2$ ($\Delta\text{mod} = -1$) $\to$ Reflex save bonus decreases by $-1$ $\to$ clicking Reflex roll opens dice modal with modified bonus.
3. **Combat Feature $\to$ Inspector Drawer $\to$ Resource Spend**:
   - In combat view, clicking *Ki Pool* opens Inspector Drawer $\to$ inspecting description and formulas $\to$ clicking "Spend 1 Use" decrements Ki resource $\to$ updates HUD and combat pips.
4. **Damage Absorption $\to$ Tactical HUD $\to$ Alert Banner**:
   - Character takes 15 damage with 10 temp HP $\to$ temp HP absorbed, 5 damage taken $\to$ HUD HP bar updates $\to$ low HP warning trigger.
5. **Long Rest Lifecycle**:
   - Long rest restores HP to max, wipes temp HP, clears nonlethal, resets all spent resources and spell slots, while retaining custom buffs.

---

## 6. Real-World Application Scenarios (Tier 4 Workloads)

1. **Workload 1: Monk Tactical Flurry & Ki Pool (Agelmund)**:
   - Monk activates *Flurry of Blows*, expends 1 point of *Ki Pool* for an extra attack at highest BAB, verifies resource counter decreases, rolls multiple unarmed strikes, takes retaliatory damage, and rolls a Fortitude save.
2. **Workload 2: Magus Spellstrike & Arcane Pool (Mazikeen / Shotrix)**:
   - Magus expends 1st-level spell slot for *Shocking Grasp*, spends 1 point of *Arcane Pool* to enhance scimitar, makes a melee touch attack roll, and performs a Concentration check against defensive casting DC.
3. **Workload 3: Inquisitor / Cleric Divine Recovery (Valerius)**:
   - High-level Inquisitor absorbs heavy blow (depleting temp HP and taking current HP damage), activates *Judgment* buff, casts *Cure Moderate Wounds*, restores regular HP, removes nonlethal damage, and rolls a Will save.
4. **Workload 4: Rogue Finesse, Negative STR & Defensive Evasion (Mariano Cardamomo)**:
   - Halfling Rogue with STR 6 ($-2$) and DEX 20 ($+5$) rolls weapon finesse attack, verifies damage includes negative STR penalty, incurs *sickened* condition ($-2$ penalty on attacks and saves), verifies Flat-Footed AC includes DEX penalty, and inspects *Evasion* badge.
5. **Workload 5: Multi-Round Party Battle & Audit Trail**:
   - Multi-round combat encounter with character switching in HUD, executing rolls, applying conditions, tracking dice history cap at 50, and resetting via Long Rest.

---

## 7. Quality Gates & Certification Criteria

- **Compilation**: Clean compile with `npx tsc --noEmit` (0 errors).
- **Execution**: All test suites pass via `npm test -- tests/e2e/`.
- **Zero Regression**: All 314 baseline unit tests remain green.
- **Coverage**:
  - Tier 1: $\ge 5$ tests per feature across all R1–R5 items (total $\ge 90$ tests).
  - Tier 2: $\ge 5$ tests per boundary item (total $\ge 45$ tests).
  - Tier 3: Comprehensive cross-store and pairwise interaction coverage (total $\ge 20$ tests).
  - Tier 4: 5 realistic combat workloads (total $\ge 15$ tests).
