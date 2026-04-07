---
name: Arcane Pool — Level 4 Options
description: At level 4 only +1 available; can choose +1 numerical or a +1-cost special property from allowed list
type: reference
---

**Source:** Ultimate Magic p. 9, Arcane Pool class feature.

**Enhancement bonus scaling:** +1 per 4 Magus levels beyond 1st.
- Level 1-4: +1 max
- Level 5-8: +2 max
- Level 9-12: +3 max
- Level 13-16: +4 max
- Level 17-20: +5 max

**At level 4 (Shotrix):** Only 1 point of enhancement to spend.

Options:
1. +1 numerical enhancement bonus (adds to attack and damage, does not stack with existing enhancement bonuses beyond +5 cap)
2. One special property costing +1: dancing, flaming, flaming burst, keen, merciful, shocking, shocking burst, speed, or vorpal — note that vorpal requires +5 enhancement to be legal on a weapon, so effectively off the list at low levels

**Keen at level 4 (Shotrix rapier case):**
- Rapier base crit range: 18-20
- With Keen: 15-20 (doubles the threat range)
- No attack or damage bonus — the +1 point goes entirely to the property
- This is a valid choice but needs different buff representation in the app (no attackMod/damageMod, instead crit range changes)

**Current JSON:** models the pure +1 numerical case with attackMod/damageMod both at 1. Correct for that use case.
