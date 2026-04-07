---
name: Furious Focus — First Attack Only
description: Furious Focus removes Power Attack penalty on first attack of the turn only; all subsequent attacks and AoOs still pay full penalty
type: reference
---

**Source:** APG p. 160, Furious Focus feat.

**Full text paraphrase:** When wielding a two-handed weapon (or one-handed with two hands) and using Power Attack, you do not suffer Power Attack's attack penalty on the first attack you make each turn. You still suffer the penalty on additional attacks, including attacks of opportunity.

**Knam (Bloodrager 4, BAB 4, PA at BAB 4-5 tier = -2/-4):**

Power Attack at BAB 4: -2 attack / +4 damage (+6 for 2H weapons)

| Attack | Net Attack Mod from PA+FF | Damage Mod |
|---|---|---|
| First attack | 0 (FF cancels the -2) | +6 |
| Additional attacks | -2 | +6 |
| Attacks of opportunity | -2 | +6 |

**App implementation note:** Knam's JSON encodes Furious Focus as a separate buff with `attackMod: +2`. When both Power Attack (-2) and Furious Focus (+2) buffs are active, net = 0 on first attack. This is correct for display but the app must communicate that FF only applies to the first attack — subsequent attacks should show -2. This is a display limitation of the current flat-modifier buff model.

**Important:** PA damage bonus always applies regardless of FF. FF only affects the attack penalty.
