---
name: Fire Bolt (Ash Subdomain) — Attack Roll Modifier
description: Domain power ranged touch attacks use BAB + DEX, not WIS; WIS only sets daily uses count
type: reference
---

**Source:** Ash Subdomain (Fire Domain variant), Ultimate Magic p. 26. Ranged touch attack rules: CRB p. 194.

**Attack roll for Fire Bolt:** BAB + DEX modifier + size modifier. WIS is NOT added to the attack roll.

**Why WIS doesn't apply:** Domain powers, spell-like abilities, and supernatural abilities that make ranged touch attacks still resolve the attack roll using the standard ranged attack formula. WIS governs spell DCs, bonus spell slots, and daily uses (3 + WIS mod for Fire Bolt). There is no core rule that substitutes WIS for DEX on domain power attack rolls.

**Noorie (Druid 4, DEX 16 = +3, BAB +3):**
- Fire Bolt attack roll: +3 (BAB) + +3 (DEX) = **+6 to hit**
- Damage: 1d6 + (4/2) = **1d6+2 fire damage**
- Range: 30 feet
- Daily uses: 3 + WIS mod = 3 + 5 = **8/day**
- Activation: standard action
- Type: spell-like ability (subject to SR, does not require concentration)

**JSON status:** Correctly encodes attack as ranged touch (+6 matches sling attack bonus), damage as 1d6+2, 8 uses/day.
