import type { ArmorClass, SavingThrow } from '../types/defense'
import type { Skill } from '../types/skills'
import type {
  Weapon,
  BuffToggle,
  ConditionType,
  CombatManeuversCalculated,
  CombatManeuverType,
  ManeuverDetail,
} from '../types/combat'
import { abilityMod } from './dice-engine'

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export interface EffectiveAbilities {
  scores: Record<AbilityKey, number>
  mods: Record<AbilityKey, number>
  deltas: Record<AbilityKey, number>
  breakdowns: Record<AbilityKey, { label: string; value: number }[]>
}

export interface EffectiveSaves {
  fort: number
  ref: number
  will: number
  fortitude: number
  reflex: number
  breakdowns: {
    fortitude: { label: string; value: number }[]
    reflex: { label: string; value: number }[]
    will: { label: string; value: number }[]
  }
}

export interface EffectiveArmorClass {
  total: number
  touch: number
  flatFooted: number
  notes: string[]
  breakdown: { label: string; value: number }[]
}

export interface EffectiveWeaponCalculated {
  attackBonus: number[]
  damageBonus: number
  acMod: number
  activeBuffNames: string[]
  extraDamageDice?: string
  attackBreakdown: { label: string; value: number }[]
  damageBreakdown: { label: string; value: number }[]
  hasteActive?: boolean
}

export interface EffectiveSkill extends Skill {
  effectiveTotal: number
  breakdown: { label: string; value: number }[]
}

export interface ActionRestriction {
  condition: ConditionType
  severity: 'info' | 'warning' | 'danger'
  title: string
  message: string
}

/**
 * Calculates effective ability scores and modifiers after applying conditions and active buffs.
 */
export function calcEffectiveAbilities(
  baseAbilities: Record<AbilityKey, number>,
  conditions: ConditionType[],
  activeBuffs: BuffToggle[]
): EffectiveAbilities {
  const scores = { ...baseAbilities }
  const breakdowns: Record<AbilityKey, { label: string; value: number }[]> = {
    str: [{ label: 'Base', value: baseAbilities.str }],
    dex: [{ label: 'Base', value: baseAbilities.dex }],
    con: [{ label: 'Base', value: baseAbilities.con }],
    int: [{ label: 'Base', value: baseAbilities.int }],
    wis: [{ label: 'Base', value: baseAbilities.wis }],
    cha: [{ label: 'Base', value: baseAbilities.cha }],
  }

  // Conditions affecting ability scores
  if (conditions.includes('fatigued')) {
    scores.str -= 2
    scores.dex -= 2
    breakdowns.str.push({ label: 'Fatigued', value: -2 })
    breakdowns.dex.push({ label: 'Fatigued', value: -2 })
  }
  if (conditions.includes('exhausted')) {
    scores.str -= 6
    scores.dex -= 6
    breakdowns.str.push({ label: 'Exhausted', value: -6 })
    breakdowns.dex.push({ label: 'Exhausted', value: -6 })
  }
  if (conditions.includes('paralyzed')) {
    // Paralyzed: effective STR and DEX are treated as 0 (-5 mod)
    const strDiff = -scores.str
    const dexDiff = -scores.dex
    scores.str = 0
    scores.dex = 0
    breakdowns.str.push({ label: 'Paralyzed', value: strDiff })
    breakdowns.dex.push({ label: 'Paralyzed', value: dexDiff })
  }

  // Active buffs modifying ability scores
  for (const buff of activeBuffs) {
    if (buff.abilityMods) {
      for (const [key, val] of Object.entries(buff.abilityMods) as [AbilityKey, number][]) {
        if (val) {
          scores[key] = (scores[key] ?? 0) + val
          breakdowns[key].push({ label: buff.name, value: val })
        }
      }
    }
  }

  const mods = {
    str: abilityMod(scores.str),
    dex: abilityMod(scores.dex),
    con: abilityMod(scores.con),
    int: abilityMod(scores.int),
    wis: abilityMod(scores.wis),
    cha: abilityMod(scores.cha),
  }

  const deltas = {
    str: mods.str - abilityMod(baseAbilities.str),
    dex: mods.dex - abilityMod(baseAbilities.dex),
    con: mods.con - abilityMod(baseAbilities.con),
    int: mods.int - abilityMod(baseAbilities.int),
    wis: mods.wis - abilityMod(baseAbilities.wis),
    cha: mods.cha - abilityMod(baseAbilities.cha),
  }

  return { scores, mods, deltas, breakdowns }
}

/**
 * Calculates effective saving throws including ability mod changes, condition penalties, and buff bonuses.
 */
export function calcEffectiveSaves(
  baseSaves: SavingThrow,
  baseAbilities: Record<AbilityKey, number>,
  effectiveAbilities: EffectiveAbilities,
  conditions: ConditionType[],
  activeBuffs: BuffToggle[]
): EffectiveSaves {
  const baseFort = baseSaves.fort ?? (baseSaves as unknown as { fortitude: number }).fortitude ?? 0
  const baseRef = baseSaves.ref ?? (baseSaves as unknown as { reflex: number }).reflex ?? 0
  const baseWill = baseSaves.will ?? 0

  const breakdowns = {
    fortitude: [{ label: 'Base', value: baseFort }],
    reflex: [{ label: 'Base', value: baseRef }],
    will: [{ label: 'Base', value: baseWill }],
  }

  let fort = baseFort
  let ref = baseRef
  let will = baseWill

  // Ability modifier shifts
  const conDelta = effectiveAbilities.mods.con - abilityMod(baseAbilities.con)
  if (conDelta !== 0) {
    fort += conDelta
    breakdowns.fortitude.push({ label: 'CON Mod', value: conDelta })
  }

  const dexDelta = effectiveAbilities.mods.dex - abilityMod(baseAbilities.dex)
  if (dexDelta !== 0) {
    ref += dexDelta
    breakdowns.reflex.push({ label: 'DEX Mod', value: dexDelta })
  }

  const wisDelta = effectiveAbilities.mods.wis - abilityMod(baseAbilities.wis)
  if (wisDelta !== 0) {
    will += wisDelta
    breakdowns.will.push({ label: 'WIS Mod', value: wisDelta })
  }

  // Conditions
  if (conditions.includes('shaken') || conditions.includes('frightened')) {
    fort -= 2
    ref -= 2
    will -= 2
    const label = conditions.includes('frightened') ? 'Frightened' : 'Shaken'
    breakdowns.fortitude.push({ label, value: -2 })
    breakdowns.reflex.push({ label, value: -2 })
    breakdowns.will.push({ label, value: -2 })
  }
  if (conditions.includes('sickened')) {
    fort -= 2
    ref -= 2
    will -= 2
    breakdowns.fortitude.push({ label: 'Sickened', value: -2 })
    breakdowns.reflex.push({ label: 'Sickened', value: -2 })
    breakdowns.will.push({ label: 'Sickened', value: -2 })
  }

  // Buffs
  for (const buff of activeBuffs) {
    if (typeof buff.saveMod === 'number' && buff.saveMod !== 0) {
      fort += buff.saveMod
      ref += buff.saveMod
      will += buff.saveMod
      breakdowns.fortitude.push({ label: buff.name, value: buff.saveMod })
      breakdowns.reflex.push({ label: buff.name, value: buff.saveMod })
      breakdowns.will.push({ label: buff.name, value: buff.saveMod })
    } else if (typeof buff.saveMod === 'object' && buff.saveMod) {
      if (buff.saveMod.fort) {
        fort += buff.saveMod.fort
        breakdowns.fortitude.push({ label: buff.name, value: buff.saveMod.fort })
      }
      if (buff.saveMod.ref) {
        ref += buff.saveMod.ref
        breakdowns.reflex.push({ label: buff.name, value: buff.saveMod.ref })
      }
      if (buff.saveMod.will) {
        will += buff.saveMod.will
        breakdowns.will.push({ label: buff.name, value: buff.saveMod.will })
      }
    }
  }

  return { fort, ref, will, fortitude: fort, reflex: ref, breakdowns }
}

/**
 * Calculates effective AC (Normal, Touch, Flat-Footed) taking into account conditions and buffs.
 */
export function calcEffectiveArmorClass(
  baseAc: ArmorClass,
  baseDexMod: number,
  effectiveDexMod: number,
  conditions: ConditionType[],
  activeBuffs: BuffToggle[]
): EffectiveArmorClass {
  const breakdown: { label: string; value: number }[] = [{ label: 'Base AC', value: baseAc.total }]
  const notes: string[] = []

  let total = baseAc.total
  let touch = baseAc.touch
  let flatFooted = baseAc.flatFooted

  // DEX shift
  const dexDelta = effectiveDexMod - baseDexMod
  if (dexDelta !== 0) {
    total += dexDelta
    touch += dexDelta
    breakdown.push({ label: 'DEX Shift', value: dexDelta })
  }

  // Loss of DEX to AC (blinded, stunned, paralyzed)
  const losesDex = conditions.includes('blinded') || conditions.includes('stunned') || conditions.includes('paralyzed')
  if (losesDex && effectiveDexMod > 0) {
    total -= effectiveDexMod
    touch -= effectiveDexMod
    breakdown.push({ label: 'Lost DEX bonus', value: -effectiveDexMod })
  }

  // Specific condition AC penalties
  if (conditions.includes('blinded')) {
    total -= 2
    touch -= 2
    flatFooted -= 2
    breakdown.push({ label: 'Blinded', value: -2 })
  }
  if (conditions.includes('stunned')) {
    total -= 2
    touch -= 2
    flatFooted -= 2
    breakdown.push({ label: 'Stunned', value: -2 })
  }
  if (conditions.includes('prone')) {
    notes.push('-4 AC vs melee / +4 AC vs ranged (Prone)')
  }

  // Active buffs
  const totalBuffAc = activeBuffs.reduce((sum, b) => sum + (b.acMod || 0), 0)
  if (totalBuffAc !== 0) {
    total += totalBuffAc
    touch += totalBuffAc
    flatFooted += totalBuffAc
    for (const b of activeBuffs) {
      if (b.acMod) breakdown.push({ label: b.name, value: b.acMod })
    }
  }

  return { total, touch, flatFooted, notes, breakdown }
}

/**
 * Calculates effective weapon stats (attack bonus, damage bonus, extra dice) taking into account
 * conditions, ability shifts, and active buffs.
 */
export function calcEffectiveWeaponStats(
  weapon: Weapon,
  baseAbilities: Record<AbilityKey, number>,
  effectiveAbilities: EffectiveAbilities,
  conditions: ConditionType[],
  allBuffs: BuffToggle[],
  activeBuffIds: string[]
): EffectiveWeaponCalculated {
  const activeBuffs = allBuffs.filter((b) => activeBuffIds.includes(b.id))
  const applicableBuffs = weapon.type === 'ranged'
    ? activeBuffs.filter((b) => !b.meleeOnly)
    : activeBuffs

  const attackBreakdown: { label: string; value: number }[] = [
    { label: 'Base BAB/Mod', value: weapon.attackBonus[0] ?? 0 },
  ]
  const damageBreakdown: { label: string; value: number }[] = [
    { label: 'Base Dmg', value: weapon.damageBonus },
  ]

  let totalAttMod = 0
  let totalDmgMod = 0

  // Ability modifier shifts
  if (weapon.type === 'melee') {
    const strDelta = effectiveAbilities.mods.str - abilityMod(baseAbilities.str)
    if (strDelta !== 0) {
      totalAttMod += strDelta
      totalDmgMod += strDelta
      attackBreakdown.push({ label: 'STR Mod', value: strDelta })
      damageBreakdown.push({ label: 'STR Mod', value: strDelta })
    }
  } else {
    const dexDelta = effectiveAbilities.mods.dex - abilityMod(baseAbilities.dex)
    if (dexDelta !== 0) {
      totalAttMod += dexDelta
      attackBreakdown.push({ label: 'DEX Mod', value: dexDelta })
    }
  }

  // Conditions affecting attack and damage
  if (conditions.includes('shaken') || conditions.includes('frightened')) {
    totalAttMod -= 2
    const label = conditions.includes('frightened') ? 'Frightened' : 'Shaken'
    attackBreakdown.push({ label, value: -2 })
  }
  if (conditions.includes('sickened')) {
    totalAttMod -= 2
    totalDmgMod -= 2
    attackBreakdown.push({ label: 'Sickened', value: -2 })
    damageBreakdown.push({ label: 'Sickened', value: -2 })
  }
  if (conditions.includes('prone') && weapon.type === 'melee') {
    totalAttMod -= 4
    attackBreakdown.push({ label: 'Prone', value: -4 })
  }

  // Applicable Buffs
  for (const b of applicableBuffs) {
    if (b.attackMod !== 0) {
      totalAttMod += b.attackMod
      attackBreakdown.push({ label: b.name, value: b.attackMod })
    }
    if (b.damageMod !== 0) {
      totalDmgMod += b.damageMod
      damageBreakdown.push({ label: b.name, value: b.damageMod })
    }
  }

  // Find extra damage dice from active buffs (e.g. Sneak Attack, Flaming, etc.)
  const extraDiceBuff = activeBuffs.find((b) => b.extraDamageDice)
  const totalAcMod = activeBuffs.reduce((sum, b) => sum + (b.acMod || 0), 0)
  const isHaste = applicableBuffs.some(
    (b) => b.id === 'haste' || b.id === 'preset-haste' || /haste/i.test(b.name)
  )

  return {
    attackBonus: weapon.attackBonus.map((a) => a + totalAttMod),
    damageBonus: weapon.damageBonus + totalDmgMod,
    acMod: totalAcMod,
    activeBuffNames: applicableBuffs.map((b) => b.name),
    extraDamageDice: extraDiceBuff?.extraDamageDice,
    attackBreakdown,
    damageBreakdown,
    hasteActive: isHaste,
  }
}

/**
 * Calculates effective skill totals with ability shifts, Shaken, Sickened, and Blinded penalties.
 */
export function calcEffectiveSkills(
  skills: Skill[],
  _baseAbilities: Record<AbilityKey, number>,
  effectiveAbilities: EffectiveAbilities,
  conditions: ConditionType[]
): EffectiveSkill[] {
  return skills.map((s) => {
    const effMod = effectiveAbilities.mods[s.ability]
    const baseTotal = s.ranks + (s.classSkill && s.ranks > 0 ? 3 : 0) + effMod + s.miscBonus

    const breakdown: { label: string; value: number }[] = [
      { label: 'Ranks', value: s.ranks },
    ]
    if (s.classSkill && s.ranks > 0) {
      breakdown.push({ label: 'Class Skill', value: 3 })
    }
    breakdown.push({ label: `${s.ability.toUpperCase()} Mod`, value: effMod })
    if (s.miscBonus !== 0) {
      breakdown.push({ label: 'Misc', value: s.miscBonus })
    }

    let penalty = 0
    if (conditions.includes('shaken') || conditions.includes('frightened')) {
      penalty -= 2
      const label = conditions.includes('frightened') ? 'Frightened' : 'Shaken'
      breakdown.push({ label, value: -2 })
    }
    if (conditions.includes('sickened')) {
      penalty -= 2
      breakdown.push({ label: 'Sickened', value: -2 })
    }
    if (conditions.includes('blinded') && (s.name.toLowerCase().includes('perception') || s.ability === 'str' || s.ability === 'dex')) {
      penalty -= 4
      breakdown.push({ label: 'Blinded', value: -4 })
    }

    return {
      ...s,
      effectiveTotal: baseTotal + penalty,
      breakdown,
    }
  })
}

/**
 * Returns tactile action restriction alerts when conditions limit or prevent character actions.
 */
export function getActiveActionRestrictions(conditions: ConditionType[]): ActionRestriction[] {
  const restrictions: ActionRestriction[] = []

  if (conditions.includes('nauseated')) {
    restrictions.push({
      condition: 'nauseated',
      severity: 'warning',
      title: 'Nauseated',
      message: 'Experienced extreme distress: You can only take a single move action per turn. No attacks, spells, or complex actions.',
    })
  }
  if (conditions.includes('stunned')) {
    restrictions.push({
      condition: 'stunned',
      severity: 'danger',
      title: 'Stunned',
      message: 'Drops all held items, cannot take actions, -2 penalty to AC, and loses Dexterity bonus to AC.',
    })
  }
  if (conditions.includes('paralyzed')) {
    restrictions.push({
      condition: 'paralyzed',
      severity: 'danger',
      title: 'Paralyzed',
      message: 'Frozen in place and helpless. Cannot move or take physical actions. Effective STR & DEX = 0 (-5 mod).',
    })
  }
  if (conditions.includes('dazed')) {
    restrictions.push({
      condition: 'dazed',
      severity: 'warning',
      title: 'Dazed',
      message: 'Unable to act normally. Can take no actions, but has no AC penalties.',
    })
  }
  if (conditions.includes('prone')) {
    restrictions.push({
      condition: 'prone',
      severity: 'info',
      title: 'Prone (On the Ground)',
      message: '-4 penalty on melee attack rolls. -4 AC vs melee attacks, but +4 AC bonus vs ranged attacks. Cannot use bows.',
    })
  }
  if (conditions.includes('blinded')) {
    restrictions.push({
      condition: 'blinded',
      severity: 'warning',
      title: 'Blinded',
      message: 'Cannot see. -2 to AC, loses Dex bonus to AC, opponents have total concealment (50% miss chance), -4 on Perception & physical checks.',
    })
  }

  return restrictions
}

/**
 * Calculates dynamic Pathfinder 1e Combat Maneuver Bonus (CMB) and Defense (CMD).
 * Takes into account Monk BAB substitution rule, Agile Maneuvers, conditions, buffs, and improved maneuver feats.
 */
export function calcCombatManeuvers(
  char: {
    class: string
    level: number
    race: string
    baseAttackBonus: number[]
    armorClass: ArmorClass
    feats?: { name: string }[]
    size?: string
  },
  effectiveAbilities: EffectiveAbilities,
  conditions: ConditionType[],
  activeBuffs: BuffToggle[]
): CombatManeuversCalculated {
  const breakdownCmb: { label: string; value: number }[] = []
  const breakdownCmd: { label: string; value: number }[] = [{ label: 'Base', value: 10 }]

  const isMonk = /monk/i.test(char.class)
  const baseBab = char.baseAttackBonus[0] ?? 0

  // BAB for CMB (Monk uses level for CMB)
  const cmbBab = isMonk ? char.level : baseBab
  breakdownCmb.push({
    label: isMonk ? `Monk Level (+${char.level})` : `Base BAB (+${baseBab})`,
    value: cmbBab,
  })

  // BAB for CMD (PF1e rules: CMD uses standard BAB, not monk level)
  breakdownCmd.push({ label: `Base BAB (+${baseBab})`, value: baseBab })

  // Agile Maneuvers feat check
  const featNames = (char.feats ?? []).map((f) => f.name)
  const hasAgileManeuvers = featNames.some((f) => /agile maneuvers/i.test(f))

  const cmbAbilityMod = hasAgileManeuvers
    ? effectiveAbilities.mods.dex
    : effectiveAbilities.mods.str
  breakdownCmb.push({
    label: hasAgileManeuvers ? 'DEX Mod (Agile Maneuvers)' : 'STR Mod',
    value: cmbAbilityMod,
  })

  // CMD adds both STR and DEX
  breakdownCmd.push({ label: 'STR Mod', value: effectiveAbilities.mods.str })

  // Loss of DEX to AC/CMD
  const losesDex =
    conditions.includes('blinded') ||
    conditions.includes('stunned') ||
    conditions.includes('paralyzed')
  const effectiveDexForCmd = losesDex
    ? Math.min(0, effectiveAbilities.mods.dex)
    : effectiveAbilities.mods.dex
  breakdownCmd.push({
    label: losesDex ? 'Lost DEX bonus' : 'DEX Mod',
    value: effectiveDexForCmd,
  })

  // Size modifier (PF1e: Fine -8, Diminutive -4, Tiny -2, Small -1, Medium 0, Large +1, Huge +2, Gargantuan +4, Colossal +8)
  const charSize = (char.size || '').toLowerCase()
  const raceLower = (char.race || '').toLowerCase()
  let sizeMod = 0
  let sizeLabel = ''

  if (charSize.includes('colossal')) {
    sizeMod = 8
    sizeLabel = 'Colossal Size'
  } else if (charSize.includes('gargantuan')) {
    sizeMod = 4
    sizeLabel = 'Gargantuan Size'
  } else if (charSize.includes('huge')) {
    sizeMod = 2
    sizeLabel = 'Huge Size'
  } else if (charSize.includes('large')) {
    sizeMod = 1
    sizeLabel = 'Large Size'
  } else if (charSize.includes('small') || /halfling|gnome|goblin|kobold/i.test(raceLower)) {
    sizeMod = -1
    sizeLabel = 'Small Size'
  } else if (charSize.includes('tiny')) {
    sizeMod = -2
    sizeLabel = 'Tiny Size'
  } else if (charSize.includes('diminutive')) {
    sizeMod = -4
    sizeLabel = 'Diminutive Size'
  } else if (charSize.includes('fine')) {
    sizeMod = -8
    sizeLabel = 'Fine Size'
  }

  if (sizeMod !== 0) {
    breakdownCmb.push({ label: sizeLabel, value: sizeMod })
    breakdownCmd.push({ label: sizeLabel, value: sizeMod })
  }

  // Deflection bonus to CMD
  if (char.armorClass.deflection && char.armorClass.deflection > 0) {
    breakdownCmd.push({ label: 'Deflection', value: char.armorClass.deflection })
  }

  // Monk AC bonus to CMD (Wisdom modifier)
  if (isMonk && effectiveAbilities.mods.wis > 0) {
    breakdownCmd.push({ label: 'Monk WIS to CMD', value: effectiveAbilities.mods.wis })
  }

  // Dodge feat to CMD
  if (featNames.some((f) => /\bdodge\b/i.test(f))) {
    breakdownCmd.push({ label: 'Dodge Feat', value: 1 })
  }

  // Conditions on CMB
  if (conditions.includes('shaken') || conditions.includes('frightened')) {
    breakdownCmb.push({
      label: conditions.includes('frightened') ? 'Frightened' : 'Shaken',
      value: -2,
    })
  }
  if (conditions.includes('sickened')) {
    breakdownCmb.push({ label: 'Sickened', value: -2 })
  }
  if (conditions.includes('prone')) {
    breakdownCmb.push({ label: 'Prone', value: -4 })
  }

  // Conditions on CMD
  if (conditions.includes('prone')) {
    breakdownCmd.push({ label: 'Prone vs Melee', value: -4 })
  }
  if (conditions.includes('blinded')) {
    breakdownCmd.push({ label: 'Blinded', value: -2 })
  }
  if (conditions.includes('stunned')) {
    breakdownCmd.push({ label: 'Stunned', value: -2 })
  }

  // Active buffs that modify attacks
  for (const b of activeBuffs) {
    if (b.attackMod !== 0) {
      breakdownCmb.push({ label: b.name, value: b.attackMod })
    }
  }

  const baseCmb = breakdownCmb.reduce((acc, item) => acc + item.value, 0)
  const baseCmd = breakdownCmd.reduce((acc, item) => acc + item.value, 0)

  // Specific maneuvers
  const maneuverDefs: {
    type: CombatManeuverType
    name: string
    featRegex: RegExp
    greaterRegex: RegExp
    description: string
  }[] = [
    {
      type: 'grapple',
      name: 'Lotta (Grapple)',
      featRegex: /improved grapple/i,
      greaterRegex: /greater grapple/i,
      description: 'Trattiene o blocca un avversario nello stesso spazio.',
    },
    {
      type: 'trip',
      name: 'Sbilanciare (Trip)',
      featRegex: /improved trip/i,
      greaterRegex: /greater trip/i,
      description: 'Fa cadere a terra prono il bersaglio.',
    },
    {
      type: 'disarm',
      name: 'Disarmare (Disarm)',
      featRegex: /improved disarm/i,
      greaterRegex: /greater disarm/i,
      description: "Fa cadere l'arma o l'oggetto impugnato dal bersaglio.",
    },
    {
      type: 'bullRush',
      name: 'Spingere (Bull Rush)',
      featRegex: /improved bull rush/i,
      greaterRegex: /greater bull rush/i,
      description: 'Spinge indietro il bersaglio di 1,5m o più.',
    },
    {
      type: 'sunder',
      name: 'Spezzare (Sunder)',
      featRegex: /improved sunder/i,
      greaterRegex: /greater sunder/i,
      description: "Danneggia un'arma o un oggetto portato dall'avversario.",
    },
    {
      type: 'overrun',
      name: 'Oltrepassare (Overrun)',
      featRegex: /improved overrun/i,
      greaterRegex: /greater overrun/i,
      description: "Travolge l'avversario durante il movimento superando il suo spazio.",
    },
    {
      type: 'dirtyTrick',
      name: 'Sporco Trucco (Dirty Trick)',
      featRegex: /improved dirty trick/i,
      greaterRegex: /greater dirty trick/i,
      description: 'Acceca, scuote o rende infermo temporaneamente il bersaglio.',
    },
    {
      type: 'reposition',
      name: 'Riposizionare (Reposition)',
      featRegex: /improved reposition/i,
      greaterRegex: /greater reposition/i,
      description: "Sposta l'avversario in un altro quadretto vicino entro portata.",
    },
    {
      type: 'steal',
      name: 'Rubare (Steal)',
      featRegex: /improved steal/i,
      greaterRegex: /greater steal/i,
      description: "Sottrae rapidamente un oggetto non impugnato all'avversario.",
    },
  ]

  const maneuvers = {} as Record<CombatManeuverType, ManeuverDetail>

  for (const def of maneuverDefs) {
    const hasImproved = featNames.some((f) => def.featRegex.test(f))
    const hasGreater = featNames.some((f) => def.greaterRegex.test(f))

    let featBonus = 0
    let featApplied: string | undefined
    if (hasGreater) {
      featBonus = 4
      featApplied = `Greater ${def.type}`
    } else if (hasImproved) {
      featBonus = 2
      featApplied = `Improved ${def.type}`
    }

    const maneuverBreakdown = [...breakdownCmb]
    if (featBonus > 0 && featApplied) {
      maneuverBreakdown.push({ label: featApplied, value: featBonus })
    }

    const cmdBonus = hasGreater ? 4 : hasImproved ? 2 : 0

    maneuvers[def.type] = {
      type: def.type,
      name: def.name,
      bonus: baseCmb + featBonus,
      provokesAoO: !hasImproved && !hasGreater,
      breakdown: maneuverBreakdown,
      featApplied,
      description: def.description,
      cmdBonus: cmdBonus > 0 ? cmdBonus : undefined,
    }
  }

  return {
    cmb: baseCmb,
    cmd: baseCmd,
    maneuvers,
    breakdownCmb,
    breakdownCmd,
  }
}
