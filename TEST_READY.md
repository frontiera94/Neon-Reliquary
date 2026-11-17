# TEST READY: Pathfinder 1e Class Mechanics E2E Test Suite

**Status**: READY FOR VERIFICATION & REGRESSION TESTING  
**Execution Pass Rate**: 100% (479 / 479 tests passing)  
**Execution Time**: ~3.9s (Master Runner) / ~18s (Parallel All Tiers)  
**Target Requirement Coverage**: R1–R8 (Features F1–F40 across 4 progressive tiers)

---

## 1. Test Architecture & Runner Commands

The end-to-end test suite is built on Vitest and provides opaque-box, requirement-driven verification of all Pathfinder 1e party class mechanics.

### Primary Runner (Master Composite Suite)
Runs all 479 tests across all 4 tiers in a single run:
```bash
npx vitest run tests/e2e/class-mechanics-e2e.test.ts
```

### Granular Tier Runners
```bash
# Tier 1: Feature Isolation (200 tests, 5 tests/feature for F1-F40)
npx vitest run tests/e2e/tier1-features.test.ts

# Tier 2: Boundary & Corner Cases (200 tests, 5 boundary tests/feature for F1-F40)
npx vitest run tests/e2e/tier2-boundaries.test.ts

# Tier 3: Multi-Feature Interactions (49 tests, 10 cross-feature combinations)
npx vitest run tests/e2e/tier3-interactions.test.ts

# Tier 4: Real-World Party Scenarios (30 tests, 6 real-world encounter workflows)
npx vitest run tests/e2e/tier4-scenarios.test.ts

# All Tiers in Parallel
npx vitest run tests/e2e/tier1-features.test.ts tests/e2e/tier2-boundaries.test.ts tests/e2e/tier3-interactions.test.ts tests/e2e/tier4-scenarios.test.ts
```

---

## 2. Test Suite Directory Layout

```
tests/e2e/
├── fixtures.ts                  # Pure PF1e rules oracles, 6 party characters, 7 Beast Shape I presets, session mocks
├── tier1-features.test.ts       # 200 tests: Individual feature validation in isolation (F1–F40)
├── tier2-boundaries.test.ts     # 200 tests: Zero/negative/extreme bounds, lethal drops, immunity limits (F1–F40)
├── tier3-interactions.test.ts   # 49 tests: Pairwise & multi-feature systemic combos
├── tier4-scenarios.test.ts      # 30 tests: 6 complete real-world party application scenarios
└── class-mechanics-e2e.test.ts  # Master runner re-exporting all suites
```

---

## 3. Test Coverage Matrix across Tiers 1–4

| Feature ID | Feature Name | Requirement | Tier 1 (Isolation) | Tier 2 (Boundaries) | Tier 3 (Interactions) | Tier 4 (Party Scenarios) |
|---|---|---|:---:|:---:|:---:|:---:|
| **F1** | `ClassMechanicsState` schema & defaults | R1 | 5 tests | 5 tests | Combo 10 | Scenario 6 |
| **F2** | `SessionState` integration & normalization | R1 | 5 tests | 5 tests | Combo 10 | Scenario 6 |
| **F3** | `advanceCharacterTurn` duration decrements & resets | R1 | 5 tests | 5 tests | Combo 1, 8, 10 | Scenario 6 |
| **F4** | Zero SQL migration persistence to JSONB | R1 | 5 tests | 5 tests | Combo 10 | Scenario 6 |
| **F5** | AC bonus separation (Natural, Dodge, Size, Deflection) | R2 | 5 tests | 5 tests | Combo 4, 5 | Scenario 4, 5 |
| **F6** | `resolveEffectiveArmorBase` Wild Shape melding | R2 | 5 tests | 5 tests | Combo 4 | Scenario 4 |
| **F7** | Bloodrage CON HP shifts (+2 HP/level = +8 HP) | R2 | 5 tests | 5 tests | Combo 2, 8 | Scenario 2, 6 |
| **F8** | Beast Shape I 7 animal presets | R3 | 5 tests | 5 tests | Combo 4 | Scenario 4 |
| **F9** | Wild Shape natural attack replacement | R3 | 5 tests | 5 tests | Combo 4 | Scenario 4 |
| **F10** | Natural Spell casting restriction warning | R3 | 5 tests | 5 tests | Combo 4 | Scenario 4 |
| **F11** | Held Spellstrike charging & miss charge retention | R4 | 5 tests | 5 tests | Combo 1, 9 | Scenario 1 |
| **F12** | Shocking Grasp +3 vs metal armor | R4 | 5 tests | 5 tests | Combo 1 | Scenario 1 |
| **F13** | Spellstrike simultaneous critical doubling | R4 | 5 tests | 5 tests | Combo 1 | Scenario 1 |
| **F14** | Spell Combat -2 atk penalty & defensive sacrifice | R4 | 5 tests | 5 tests | Combo 1 | Scenario 1 |
| **F15** | Spell Combat free melee attack in full attack | R4 | 5 tests | 5 tests | Combo 1 | Scenario 1 |
| **F16** | Arcane Pool +1 enhancement (10 rounds) | R4 | 5 tests | 5 tests | Combo 1, 10 | Scenario 6 |
| **F17** | Spell Recall slot restoration via Arcane Pool | R4 | 5 tests | 5 tests | Combo 1 | Scenario 1 |
| **F18** | Bloodrage stat & reach bonuses (+4 STR/CON, +10 ft reach) | R5 | 5 tests | 5 tests | Combo 2 | Scenario 2 |
| **F19** | Bloodrage lethal exit danger warning | R5 | 5 tests | 5 tests | Combo 2, 8 | Scenario 2, 6 |
| **F20** | Bloodrage fatigue application (2x rounds raged) | R5 | 5 tests | 5 tests | Combo 2, 8 | Scenario 2, 6 |
| **F21** | Ring of Rat Fangs secondary bite in full attack | R5 | 5 tests | 5 tests | Combo 2 | Scenario 2 |
| **F22** | Furious Focus 1st attack PA penalty suppression | R5 | 5 tests | 5 tests | Combo 2 | Scenario 2 |
| **F23** | Staggering Strike DC 15 Fortitude rider | R5 | 5 tests | 5 tests | Combo 6 | Scenario 1 |
| **F24** | Dynamic Witch Hex DC formula (10 + 1/2 lvl + INT) | R6 | 5 tests | 5 tests | Combo 3, 7 | Scenario 3 |
| **F25** | Hex target tracking (Evil Eye, Misfortune, Slumber) | R6 | 5 tests | 5 tests | Combo 3 | Scenario 3 |
| **F26** | Fortune cross-companion session synchronization | R6 | 5 tests | 5 tests | Combo 3, 7 | Scenario 3 |
| **F27** | Cackle move action (+1 round, 1/round, excludes Slumber) | R6 | 5 tests | 5 tests | Combo 3, 7 | Scenario 3 |
| **F28** | 24h immunity log & Long Rest reset | R6 | 5 tests | 5 tests | Combo 3 | Scenario 3 |
| **F29** | Monk Ki Pool actions (Defense, Extra Flurry, Speed, Wholeness) | R7 | 5 tests | 5 tests | Combo 5 | Scenario 5 |
| **F30** | Stunning Fist declaration (DC 14, Stunned/Fatigued) | R7 | 5 tests | 5 tests | Combo 5 | Scenario 5 |
| **F31** | Jabbing Style +1d6 extra damage on sequential hits | R7 | 5 tests | 5 tests | Combo 5 | Scenario 5 |
| **F32** | Rogue Debilitating Injury reminder (anti-double-counting) | R7 | 5 tests | 5 tests | Combo 6, 10 | Scenario 1 |
| **F33** | Rogue Underhanded (max sneak damage from surprise) | R7 | 5 tests | 5 tests | Combo 6 | Scenario 1 |
| **F34** | Halfling dagger critical confirmation bonus (+3) | R7 | 5 tests | 5 tests | Combo 6 | Scenario 1 |
| **F35** | ClassMechanicsPanel glassmorphic UI mount & Fine Turno | R8 | 5 tests | 5 tests | Combo 10 | Scenario 6 |
| **F36** | WeaponCard integration hooks | R8 | 5 tests | 5 tests | Combo 1, 2 | Scenario 1, 2 |
| **F37** | FullAttackModal multi-attack generation | R8 | 5 tests | 5 tests | Combo 1, 2, 5 | Scenario 1, 2, 5 |
| **F38** | DiceOverlayModal dual spellstrike damage & DC riders | R8 | 5 tests | 5 tests | Combo 1, 5 | Scenario 1, 5 |
| **F39** | TacticalHUD AC popovers & lethal exit danger alerts | R8 | 5 tests | 5 tests | Combo 2, 8 | Scenario 2, 6 |
| **F40** | Character JSON cleanup (0/0/0 buffs removed, validated preserved) | R8 | 5 tests | 5 tests | Combo 10 | Scenario 6 |

---

## 4. Summary of Test Tier Counts

- **Tier 1 (Feature Isolation)**: 200 tests (Target: ≥200)
- **Tier 2 (Boundary & Corner Cases)**: 200 tests (Target: ≥200)
- **Tier 3 (Multi-Feature Interactions)**: 49 tests (Target: ≥40)
- **Tier 4 (Real-World Party Scenarios)**: 30 tests across 6 scenarios (Target: ≥6)
- **Grand Total**: **479 tests** (Target: ≥446 tests, **+33 tests above target**)
