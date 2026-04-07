---
name: Known JSON Data Issues
description: Errors and ambiguities found in character JSON files during rules verification sessions
type: project
---

**Verified 2026-04-07:**

## Valerius Thorne (sample-valerius.json)
- **Rage buff invalid:** `buffs` array contains a "Rage" entry with attackMod +2, damageMod +3, acMod -2. Rage is a Barbarian/Bloodrager class feature — Inquisitors cannot access it. No source identified. Should be removed or replaced with a labeled external effect (e.g., "Rage (spell effect)" if from the Rage spell — but that spell is not on the Inquisitor spell list either).
- Judgment simultaneous count: can maintain 2 at level 12 (Second Judgment at level 8). `classAbilities` only shows one judgment type; all nine judgment options should be available to the player.
- Greater Bane data is correct: +4d6 extra damage, +2 attack enhancement, 12 rounds/day.

## Agelmund (agelmund.json)
- **BAB discrepancy:** `baseAttackBonus: [4]` for a Monk 4. CRB Monk table gives BAB +3 at level 4 (3/4 progression). The flurry attacks [9,9] are computed as BAB 4 + STR 5. This is consistent with the common house rule "monk uses monk level as BAB for flurry." Needs GM confirmation. If RAW, BAB should be [3] and flurry should be [8,8].
- All other data appears correct.

## Kaelen Nightwhisper (sample-kaelen.json)
- Sneak Attack +4d6 at level 8: correct.
- Power Attack -2/+4 at BAB 6: correct.
- No errors found.

## Knam (knam.json)
- Bloodrage and Furious Focus modeling: correct in isolation. The flat-modifier buff model cannot distinguish "first attack" from "subsequent attacks" for Furious Focus — the UI shows a net of 0 when both PA and FF are active, but does not enforce the per-attack distinction. This is a known limitation of the buff model, not a data error.
- Bloodrage damageMod +3 (marginal 2H STR gain): correct math.
- Power Attack damageMod +6 (2H): correct.

## Noorie (noorie.json)
- Fire Bolt attack uses DEX (+3) not WIS (+5): the JSON doesn't store the attack modifier derivation, but the dailyResources entry "ranged touch 1d6+2" is correctly labeled.
- All other data appears correct.

## Shotrix Blackburn (shotrix-blackburn.json)
- True Strike spell description does not note that it cannot be used as the Spellstrike delivery spell (it is Personal range). Consider adding a note to prevent player confusion.
- Arcane Pool buff models numerical +1 case: correct. Does not model the alternative of choosing a +1 property (Keen, Flaming, etc.) — this is an acceptable simplification.
- No errors found.
