---
name: Magus Spell Combat + Spellstrike Interactions
description: -2 applies to all attacks including Spellstrike; True Strike is Personal range so cannot be Spellstrike target; Arcane Pool options at level 4
type: reference
---

**Source:** Ultimate Magic p. 9-10, Magus class features.

**Spell Combat (-2 applies to all weapon attacks):**
The -2 penalty from Spell Combat applies to every melee weapon attack made during that full-round action, including the Spellstrike delivery attack. Spellstrike replaces the normal free touch attack from a touch spell — it becomes a melee weapon attack, so it takes the -2.

Shotrix (Magus 4, BAB 3, DEX 18 via Weapon Finesse, rapier):
- Normal rapier: +7 (BAB 3 + DEX 4)
- During Spell Combat: +5 (−2 penalty)
- With Arcane Pool +1: +6 during Spell Combat

**True Strike + Spellstrike (important interaction):**
- True Strike (CRB p. 362) grants +20 insight bonus to next single attack roll
- True Strike is **Personal range** — cannot be delivered via Spellstrike (Spellstrike requires a touch spell)
- Correct use: cast True Strike via Spell Combat → +20 applies to first weapon attack that turn (a normal melee weapon attack, NOT a Spellstrike)
- To combine True Strike with Spellstrike: cast True Strike on a prior turn (or via Spell Recall), then next turn Spellstrike with a touch spell while True Strike +20 is still active on the next attack roll

**Arcane Pool at level 4:**
- Maximum pool bonus: +1 (another +1 gained at level 5, 9, 13, 17)
- Options: +1 numerical enhancement OR one +1-cost special property (Flaming, Keen, Shock, etc.) from the allowed list
- Cannot add properties costing more than available pool bonus points
- Duration: 1 minute per activation
- Shotrix JSON buff: `attackMod: 1, damageMod: 1` — models the numerical +1 case correctly

**Spell Recall:** Spend arcane pool points equal to spell level to re-prepare a spell that has been cast (swift action). Very powerful for level 1 spells.
