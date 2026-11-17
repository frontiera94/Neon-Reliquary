/**
 * src/lib/class-mechanics.ts
 * Pure rules calculations and mechanical helpers for Pathfinder 1e party mechanics.
 */

import type {
  HexType,
  HexImmunityRecord,
  DebilitatingInjuryType,
  ActiveHex,
  ClassMechanicsState,
} from '../types/class-mechanics'
import {
  getDefaultClassMechanics,
  createDefaultClassMechanics,
  normalizeClassMechanics,
  resetClassMechanicsOnLongRest,
} from '../types/class-mechanics'
import type { SessionState } from '../types/session'
import type { FullCharacter } from '../store/useCharacterStore'
import { defaultActionEconomy } from '../store/useSessionStore'
import {
  calcEffectiveMaxHp,
  checkBloodrageExitSafety,
  evaluateBloodrageExitRisk,
  resolveEffectiveArmorBase,
} from './stat-calc'

export {
  getDefaultClassMechanics,
  createDefaultClassMechanics,
  normalizeClassMechanics,
  resetClassMechanicsOnLongRest,
  calcEffectiveMaxHp,
  checkBloodrageExitSafety,
  evaluateBloodrageExitRisk,
  resolveEffectiveArmorBase,
}

/** Custom buff id injected on an ally's session when a witch casts Fortune on them. */
export const FORTUNE_HEX_BUFF_ID = 'fortune-hex'

/**
 * Calculates Witch Hex save DC: 10 + floor(level / 2) + INT modifier.
 * Mazikeen (Level 4, INT 20 mod +5) = 10 + 2 + 5 = 17.
 */
export function calcHexDc(casterLevel: number, castingMod: number): number {
  return 10 + Math.floor(casterLevel / 2) + castingMod
}

/**
 * Calculates Monk Stunning Fist save DC: 10 + floor(level / 2) + WIS modifier.
 * Agelmund (Level 4, WIS 14 mod +2) = 10 + 2 + 2 = 14.
 */
export function calcStunningFistDc(monkLevel: number, wisMod: number): number {
  return 10 + Math.floor(monkLevel / 2) + wisMod
}

/**
 * Checks if a target is currently immune to a specific Witch hex (24-hour immunity rule).
 */
export function isTargetImmuneToHex(
  targetName: string,
  hexType: HexType,
  immunities: HexImmunityRecord[] | Record<string, unknown>
): boolean {
  const normName = targetName.trim().toLowerCase()
  if (Array.isArray(immunities)) {
    return immunities.some(
      (imm) => imm.hexType === hexType && imm.targetName.trim().toLowerCase() === normName
    )
  }
  if (immunities && typeof immunities === 'object') {
    const entry = immunities[normName] ?? immunities[targetName]
    if (!entry) return false
    if (typeof entry === 'string') return entry === hexType
    if (typeof entry === 'object' && entry !== null && 'hexType' in entry) {
      return (entry as { hexType: unknown }).hexType === hexType
    }
  }
  return false
}

/**
 * Bloodrage Constitution HP shift: +4 CON grants +2 CON mod = +2 HP per level.
 * Knam (Level 4): +2 * 4 = +8 HP.
 */
export function calcBloodrageHpShift(level: number, conBonus = 4): number {
  const conModGain = Math.floor(conBonus / 2)
  return conModGain * Math.max(1, level)
}

/**
 * Evaluates whether exiting Bloodrage will knock the character unconscious (<= 0 HP)
 * or kill them (<= -CON death threshold).
 */
export function isBloodrageExitLethal(
  currentHp: number,
  conScore: number,
  level: number,
  conBonus = 4
): { isLethal: boolean; isUnconscious: boolean; hpAfterExit: number } {
  const hpLost = calcBloodrageHpShift(level, conBonus)
  const hpAfterExit = currentHp - hpLost
  return {
    isLethal: hpAfterExit <= -conScore,
    isUnconscious: hpAfterExit <= 0,
    hpAfterExit,
  }
}

/**
 * Calculates fatigue duration in rounds upon exiting Bloodrage (2x rounds raged).
 */
export function calcFatigueRounds(roundsRaged: number): number {
  return Math.max(0, roundsRaged * 2)
}

/**
 * Defensive Casting Sacrifice for Magus Spell Combat:
 * Converts 0 to 4 attack penalty into +0 to +4 concentration bonus.
 */
export function calcMagusSpellCombatConcentration(
  baseConcentration: number,
  sacrifice: number
): number {
  const clampedSacrifice = Math.max(0, Math.min(4, sacrifice))
  return baseConcentration + clampedSacrifice
}

export function calcMagusSpellCombatAttackPenalty(sacrifice: number): number {
  const clampedSacrifice = Math.max(0, Math.min(4, sacrifice))
  return -2 - clampedSacrifice
}

/**
 * Spellstrike Critical Hit Resolution:
 * Confirmed crit multiplies weapon damage by its weapon multiplier,
 * and doubles spell damage (x2).
 */
export function calcSpellstrikeCritMultipliers(
  weaponCritMultiplier: number,
  isConfirmedCrit: boolean
): { weaponMultiplier: number; spellMultiplier: number } {
  if (!isConfirmedCrit) {
    return { weaponMultiplier: 1, spellMultiplier: 1 }
  }
  return {
    weaponMultiplier: weaponCritMultiplier,
    spellMultiplier: 2, // PF1e: Spell damage multiplier is always x2
  }
}

/**
 * Halfling Dagger Critical Confirmation Bonus:
 * Favored class bonus adds +3 to critical confirmation rolls with daggers.
 */
export function calcHalflingDaggerCritConfirm(
  charRace: string,
  weaponNameOrTags: string | string[]
): number {
  const isHalfling = /halfling/i.test(charRace)
  if (!isHalfling) return 0

  const str = Array.isArray(weaponNameOrTags)
    ? weaponNameOrTags.join(' ')
    : weaponNameOrTags
  const isDagger = /dagger|pugnale/i.test(str)

  return isDagger ? 3 : 0
}

/**
 * Debilitating Injury Mechanical Penalties:
 * - Bewildered: -2 AC vs all, -4 AC vs rogue
 * - Disoriented: -2 attack vs all, -4 attack vs rogue
 * - Hampered: Halves all movement speeds, cannot 5-foot step
 */
export function calcDebilitatingInjuryEffect(type: DebilitatingInjuryType) {
  switch (type) {
    case 'bewildered':
      return { acPenaltyAll: -2, acPenaltyRogue: -4, atkPenaltyAll: 0, atkPenaltyRogue: 0, halvesSpeed: false }
    case 'disoriented':
      return { acPenaltyAll: 0, acPenaltyRogue: 0, atkPenaltyAll: -2, atkPenaltyRogue: -4, halvesSpeed: false }
    case 'hampered':
      return { acPenaltyAll: 0, acPenaltyRogue: 0, atkPenaltyAll: 0, atkPenaltyRogue: 0, halvesSpeed: true }
  }
}

/**
 * Rogue Underhanded Sneak Damage:
 * Maximized sneak attack damage during surprise round (6 per die).
 * Mariano (Level 5, 3d6 sneak attack) = 3 * 6 = 18 damage.
 */
export function calcUnderhandedDamage(sneakDiceCount = 3): number {
  return sneakDiceCount * 6
}

/**
 * Pure turn advancement engine simulating atomic decrements and resets.
 */
export function advanceTurnMechanics(
  session: SessionState,
  character: FullCharacter
): SessionState {
  const currentMechanics = session.classMechanics ?? getDefaultClassMechanics(character.id, character.class)
  const nextMechanics: ClassMechanicsState = { ...currentMechanics }
  let nextConditions = [...session.conditions]
  const nextSpentResources = { ...session.spentResources }
  let nextActiveBuffIds = session.activeBuffIds ? [...session.activeBuffIds] : []
  let nextCustomBuffs = session.customBuffs ? [...session.customBuffs] : undefined
  let nextCurrentHp = session.currentHp

  // 1. Magus (Shotrix)
  if (nextMechanics.magus) {
    const magus = { ...nextMechanics.magus }
    if (magus.arcanePoolWeapon && magus.arcanePoolWeapon.active) {
      const nextRounds = Math.max(0, magus.arcanePoolWeapon.remainingRounds - 1)
      if (nextRounds <= 0) {
        magus.arcanePoolWeapon = null
        magus.arcaneWeaponActive = false
        magus.arcaneWeaponRoundsLeft = 0
      } else {
        magus.arcanePoolWeapon = { ...magus.arcanePoolWeapon, remainingRounds: nextRounds }
        magus.arcaneWeaponRoundsLeft = nextRounds
      }
    } else if (magus.arcaneWeaponActive && (magus.arcaneWeaponRoundsLeft ?? 0) > 0) {
      const nextRounds = Math.max(0, (magus.arcaneWeaponRoundsLeft ?? 1) - 1)
      magus.arcaneWeaponRoundsLeft = nextRounds
      if (nextRounds === 0) {
        magus.arcaneWeaponActive = false
        magus.arcanePoolWeapon = null
      }
    }
    nextMechanics.magus = magus

    // Arcane Pool weapon enhancement ended: drop the matching attack/damage buff.
    const arcaneStillActive = Boolean(
      magus.arcanePoolWeapon?.active || (magus.arcaneWeaponActive && (magus.arcaneWeaponRoundsLeft ?? 0) > 0)
    )
    if (!arcaneStillActive) {
      nextActiveBuffIds = nextActiveBuffIds.filter((id) => id !== 'arcane-pool-weapon')
    }
  }

  // 2. Bloodrager (Knam)
  if (nextMechanics.bloodrager) {
    const bloodrager = { ...nextMechanics.bloodrager }
    const isRaging = Boolean(bloodrager.isRaging ?? bloodrager.isBloodraging)

    if (isRaging) {
      const rounds = (bloodrager.roundsRagedThisCombat ?? bloodrager.roundsCurrentRage ?? 0) + 1
      bloodrager.roundsRagedThisCombat = rounds
      bloodrager.roundsCurrentRage = rounds

      // Daily resource consumption
      const rageResource = character.dailyResources?.find((r) => /rage|bloodrage|ira/i.test(`${r.id} ${r.name}`))
      const resourceId = rageResource?.id ?? 'bloodrage-rounds'
      const maxRage = rageResource?.total ?? 14
      const currentSpent = nextSpentResources[resourceId] ?? 0

      if (currentSpent + 1 >= maxRage) {
        // Auto exit rage on exhaustion
        nextSpentResources[resourceId] = maxRage
        bloodrager.isRaging = false
        bloodrager.isBloodraging = false
        const fatigue = calcFatigueRounds(rounds)
        bloodrager.fatigueCountdown = fatigue
        bloodrager.fatigueRoundsLeft = fatigue
        bloodrager.roundsRagedThisCombat = 0
        bloodrager.roundsCurrentRage = 0
        if (!nextConditions.includes('fatigued')) {
          nextConditions.push('fatigued')
        }
        const hpLost = calcBloodrageHpShift(character.level ?? 4)
        const conScore = character.abilities?.con ?? 16
        nextCurrentHp = Math.max(-conScore, nextCurrentHp - hpLost)

        // Auto exit rage removes bloodrage buff
        const bloodrageBuff = character.buffs?.find((b) => /bloodrage|ira/i.test(`${b.id} ${b.name}`))
        nextActiveBuffIds = nextActiveBuffIds.filter(
          (id) => (!bloodrageBuff || id !== bloodrageBuff.id) && !/bloodrage|ira/i.test(id)
        )
      } else {
        nextSpentResources[resourceId] = currentSpent + 1
      }
    } else {
      const currentFatigue = bloodrager.fatigueCountdown ?? bloodrager.fatigueRoundsLeft ?? 0
      if (currentFatigue > 0) {
        const nextFatigue = Math.max(0, currentFatigue - 1)
        bloodrager.fatigueCountdown = nextFatigue
        bloodrager.fatigueRoundsLeft = nextFatigue
        if (nextFatigue === 0) {
          nextConditions = nextConditions.filter((c) => c !== 'fatigued')
        }
      }
    }

    // Reset Furious Focus per round
    bloodrager.furiousFocusAppliedThisRound = false
    bloodrager.furiousFocusReady = true
    nextMechanics.bloodrager = bloodrager
  }

  // 3. Witch (Mazikeen)
  if (nextMechanics.witch) {
    const witch = { ...nextMechanics.witch }
    const updatedHexes: ActiveHex[] = []
    for (const hex of witch.activeHexes ?? []) {
      const curDur = hex.remainingRounds ?? hex.durationRounds ?? 1
      const nextDur = curDur - 1
      if (nextDur > 0) {
        updatedHexes.push({
          ...hex,
          remainingRounds: nextDur,
          durationRounds: nextDur,
        })
      }
    }
    witch.activeHexes = updatedHexes
    witch.cackleUsedThisRound = false
    nextMechanics.witch = witch
  }

  // 4. Monk (Agelmund)
  if (nextMechanics.monk) {
    const monk = { ...nextMechanics.monk }
    monk.kiExtraAttackActive = false
    monk.kiExtraAttack = false
    monk.stunningFistDeclared = null
    monk.stunningFistActive = false

    const defRounds = monk.kiDefenseRounds ?? monk.kiDefenseRoundsLeft ?? 0
    if (defRounds > 0) {
      const nextDef = Math.max(0, defRounds - 1)
      monk.kiDefenseRounds = nextDef
      monk.kiDefenseRoundsLeft = nextDef
      if (nextDef === 0) {
        nextActiveBuffIds = nextActiveBuffIds.filter((b) => b !== 'ki-defense')
        if (nextCustomBuffs) {
          nextCustomBuffs = nextCustomBuffs.map((b) =>
            b.id === 'ki-defense' ? { ...b, active: false } : b
          )
        }
      }
    }

    const spdRounds = monk.kiSpeedRounds ?? monk.kiSpeedRoundsLeft ?? 0
    if (spdRounds > 0) {
      const nextSpd = Math.max(0, spdRounds - 1)
      monk.kiSpeedRounds = nextSpd
      monk.kiSpeedRoundsLeft = nextSpd
    }

    nextMechanics.monk = monk
  }

  // 5. Rogue (Mariano)
  if (nextMechanics.rogue) {
    const rogue = { ...nextMechanics.rogue }
    if (rogue.debilitatingInjury) {
      const curRounds = rogue.debilitatingInjury.remainingRounds ?? rogue.debilitatingInjury.roundsLeft ?? 1
      const nextRounds = curRounds - 1
      if (nextRounds <= 0) {
        rogue.debilitatingInjury = null
      } else {
        rogue.debilitatingInjury = {
          ...rogue.debilitatingInjury,
          remainingRounds: nextRounds,
          roundsLeft: nextRounds,
        }
      }
    }
    nextMechanics.rogue = rogue
  }

  // Fortune hex received from a witch lasts one round: expire it on the ally's own turn end.
  nextActiveBuffIds = nextActiveBuffIds.filter((id) => id !== FORTUNE_HEX_BUFF_ID)
  if (nextCustomBuffs) {
    nextCustomBuffs = nextCustomBuffs.filter((b) => b.id !== FORTUNE_HEX_BUFF_ID)
  }

  const nextRound = (session.currentRound ?? 1) + 1

  return {
    ...session,
    currentHp: nextCurrentHp,
    conditions: nextConditions,
    activeBuffIds: nextActiveBuffIds,
    customBuffs: nextCustomBuffs ?? session.customBuffs,
    spentResources: nextSpentResources,
    classMechanics: nextMechanics,
    actionEconomy: defaultActionEconomy(),
    currentRound: nextRound,
  }
}
