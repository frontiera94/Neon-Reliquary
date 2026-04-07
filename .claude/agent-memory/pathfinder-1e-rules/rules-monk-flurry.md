---
name: Monk Flurry of Blows — BAB Rule
description: Flurry BAB uses monk class table (3/4 per level), not monk level; level 4 = BAB 3, flurry +2/+2 base
type: reference
---

**RAW (CRB p. 56-57):** Monk BAB follows the 3/4 progression (medium BAB). At level 4, BAB = +3. The Flurry of Blows table in the CRB shows the attack bonuses directly as +2/+2 at level 4 (BAB minus flurry adjustment).

**Common misconception:** Many tables house-rule that Monks use monk level as BAB for flurry purposes. This was in early beta but was NOT in the final PF1e CRB release.

**Agelmund (Monk 4, STR 20):**
- RAW flurry: +7/+7 (BAB 3 + STR 5, at +2/+2 base from flurry table... actually flurry at level 4 = full BAB attacks with one extra, not reduced. Re-check: the CRB says the monk makes one additional attack "as if using TWF" — the flurry table gives the attack progression directly)
- The Agelmund JSON shows baseAttackBonus [4] and attacks [9,9] — if taken at face value, BAB 4 + STR 5 = +9 each, which corresponds to "monk level = BAB" house rule
- Flag to GM before hardcoding; document which interpretation is in use

**Additional Flurry rules:**
- Full STR bonus to all flurry attacks (not 1/2 for off-hand)
- Can mix unarmed strikes and monk special weapons freely
- At level 4: two attacks. At level 8: three attacks. At level 11: four attacks.
- Ki extra attack (1 point): adds one more attack at highest BAB, usable during flurry
