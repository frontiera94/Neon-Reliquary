/**
 * src/types/class-mechanics.ts
 * Pathfinder 1e Party Class Mechanics State Schema
 *
 * Defines the core state model for all 6 active party classes:
 * - Druid (Wild Shape & animal form)
 * - Magus (Held Spellstrike, Spell Combat, Arcane Pool)
 * - Bloodrager (Bloodrage, Fatigue, Aberrant Reach, Furious Focus)
 * - Witch (Hexes, Cackle, 24h immunity tracking)
 * - Monk (Ki pool actions, Stunning Fist declaration, Jabbing Style)
 * - Rogue (Debilitating Injury, Underhanded, Halfling dagger crit)
 */

/* -------------------------------------------------------------------------- */
/* 1. Druid — Wild Shape (Noorie)                                             */
/* -------------------------------------------------------------------------- */

export interface WildShapeAttack {
  name: string
  count: number
  dice: string
  damageBonusType: 'str' | 'half-str' | '1.5-str'
  isPrimary: boolean
  riderEffect?: string
}

export interface WildShapePreset {
  id: string
  name: string
  size: 'Small' | 'Medium' | 'small' | 'medium'
  statBonus?: {
    str?: number
    dex?: number
  }
  strBonus?: number
  dexBonus?: number
  naturalArmorBonus: number
  sizeAcBonus?: number
  sizeAtkBonus?: number
  sizeCmbCmdMod?: number
  stealthBonus?: number
  speed: number
  specialMovement?: {
    fly?: number
    flyManeuverability?: 'poor' | 'average' | 'good'
    swim?: number
    climb?: number
    jet?: number
  }
  specialSpeeds?: {
    fly?: { speed: number; maneuverability: 'poor' | 'average' | 'good' }
    swim?: number
    climb?: number
    jet?: number
  }
  attacks?: WildShapeAttack[]
  naturalAttacks?: Array<{
    name: string
    isPrimary: boolean
    damageDice: string
    attackCount: number
    strMultiplier: number
    attackBonusMod: number
    trip?: boolean
    grab?: boolean
  }>
  senses: string[]
  description?: string
  specialAbilities?: string[]
}

export interface DruidMechanicsState {
  active: boolean
  formId: string | null
  meldedArmor?: boolean
  hasNaturalSpellFeat?: boolean
  // Aliases for compatibility
  wildShapeActive?: boolean
  currentFormId?: string | null
  activeForm?: WildShapePreset | null
}

/* -------------------------------------------------------------------------- */
/* 2. Magus — Spellstrike, Spell Combat & Arcane Pool (Shotrix Blackburn)     */
/* -------------------------------------------------------------------------- */

export interface HeldSpellstrike {
  spellId: string
  spellName: string
  spellLevel: number
  damageDice: string
  damageType: string
  chargesRemaining: number
  chargesMax: number
  hasMetalBonusToggle?: boolean
  metalBonusActive?: boolean
  critMultiplier: number
}

export interface ArcanePoolWeaponBuff {
  active: boolean
  bonus: number
  remainingRounds: number
}

export interface MagusMechanicsState {
  heldSpellstrike: HeldSpellstrike | null
  spellCombatActive: boolean
  defensiveCastingSacrifice: number
  arcanePoolWeapon?: ArcanePoolWeaponBuff | null
  // Aliases for compatibility
  arcaneWeaponActive?: boolean
  arcaneWeaponRoundsLeft?: number
  arcaneWeaponBonus?: number
}

/* -------------------------------------------------------------------------- */
/* 3. Bloodrager — Bloodrage, Fatigue & Reach (Knam)                          */
/* -------------------------------------------------------------------------- */

export interface BloodragerMechanicsState {
  isRaging: boolean
  roundsRagedThisCombat: number
  fatigueCountdown: number
  aberrantReachActive: boolean
  staggeringStrikeUsesRemaining: number
  furiousFocusAppliedThisRound: boolean
  // Aliases for compatibility
  isBloodraging?: boolean
  roundsCurrentRage?: number
  fatigueRoundsLeft?: number
  furiousFocusReady?: boolean
  staggeringStrikeUsesSpent?: number
}

/* -------------------------------------------------------------------------- */
/* 4. Witch — Hexes, Cackle & Immunity Tracking (Mazikeen Noctis)             */
/* -------------------------------------------------------------------------- */

export type HexType = 'evil-eye' | 'misfortune' | 'slumber' | 'fortune'

export type EvilEyeTargetStat = 'ac' | 'attacks' | 'saves' | 'ability' | 'skills'

export interface ActiveHex {
  id: string
  hexType: HexType
  type?: HexType
  targetName: string
  targetType: 'enemy' | 'ally'
  remainingRounds: number
  durationRounds?: number
  isExtendableByCackle: boolean
  isCackleable?: boolean
  cackleExtendable?: boolean
  evilEyeStat?: EvilEyeTargetStat
  saveOutcome?: 'passed' | 'failed'
  allyCharacterId?: string
}

export interface HexImmunityRecord {
  targetName: string
  hexType: HexType
  appliedAtTimestamp: number
}

export interface WitchMechanicsState {
  cackleUsedThisRound: boolean
  activeHexes: ActiveHex[]
  immuneTargets: Record<string, { hexType: HexType; timestamp?: number } | string>
  targetImmunities?: HexImmunityRecord[]
}

/* -------------------------------------------------------------------------- */
/* 5. Monk — Ki Pool, Stunning Fist & Jabbing Style (Agelmund)                */
/* -------------------------------------------------------------------------- */

export interface MonkMechanicsState {
  kiDefenseRounds: number
  kiSpeedRounds: number
  kiExtraAttackActive: boolean
  stunningFistDeclared: 'stunned' | 'fatigued' | null
  jabbingStyleActive: boolean
  stunningFistDc?: number
  // Aliases for compatibility
  kiDefenseRoundsLeft?: number
  kiSpeedRoundsLeft?: number
  kiExtraAttack?: boolean
  stunningFistActive?: boolean
  stunningFistCondition?: 'stunned' | 'fatigued'
}

/* -------------------------------------------------------------------------- */
/* 6. Rogue — Debilitating Injury & Underhanded (Mariano Cardamomo)           */
/* -------------------------------------------------------------------------- */

export type DebilitatingInjuryType = 'bewildered' | 'disoriented' | 'hampered'

export interface DebilitatingInjury {
  active?: boolean
  type?: DebilitatingInjuryType
  mode?: DebilitatingInjuryType
  remainingRounds: number
  roundsLeft?: number
  targetName?: string
}

export interface RogueMechanicsState {
  debilitatingInjury: DebilitatingInjury | null
  underhandedAvailable: boolean
  halflingDaggerCritBonusActive: boolean
  underhandedReady?: boolean
  halflingDaggerCritBonus?: number
}

/* -------------------------------------------------------------------------- */
/* Composite Class Mechanics State                                            */
/* -------------------------------------------------------------------------- */

export interface ClassMechanicsState {
  druid?: DruidMechanicsState
  magus?: MagusMechanicsState
  bloodrager?: BloodragerMechanicsState
  witch?: WitchMechanicsState
  monk?: MonkMechanicsState
  rogue?: RogueMechanicsState
  wildShape?: DruidMechanicsState
}

/* -------------------------------------------------------------------------- */
/* Default Factories                                                          */
/* -------------------------------------------------------------------------- */

export function createDefaultDruidMechanics(): DruidMechanicsState {
  return {
    active: false,
    formId: null,
    meldedArmor: false,
    hasNaturalSpellFeat: false,
    wildShapeActive: false,
    currentFormId: null,
    activeForm: null,
  }
}

export function createDefaultMagusMechanics(): MagusMechanicsState {
  return {
    heldSpellstrike: null,
    spellCombatActive: false,
    defensiveCastingSacrifice: 0,
    arcanePoolWeapon: null,
    arcaneWeaponActive: false,
    arcaneWeaponRoundsLeft: 0,
    arcaneWeaponBonus: 1,
  }
}

export function createDefaultBloodragerMechanics(): BloodragerMechanicsState {
  return {
    isRaging: false,
    roundsRagedThisCombat: 0,
    fatigueCountdown: 0,
    aberrantReachActive: false,
    staggeringStrikeUsesRemaining: 5,
    furiousFocusAppliedThisRound: false,
    isBloodraging: false,
    roundsCurrentRage: 0,
    fatigueRoundsLeft: 0,
    furiousFocusReady: true,
    staggeringStrikeUsesSpent: 0,
  }
}

export function createDefaultWitchMechanics(): WitchMechanicsState {
  return {
    cackleUsedThisRound: false,
    activeHexes: [],
    immuneTargets: {},
    targetImmunities: [],
  }
}

export function createDefaultMonkMechanics(): MonkMechanicsState {
  return {
    kiDefenseRounds: 0,
    kiSpeedRounds: 0,
    kiExtraAttackActive: false,
    stunningFistDeclared: null,
    jabbingStyleActive: false,
    stunningFistDc: 14,
    kiDefenseRoundsLeft: 0,
    kiSpeedRoundsLeft: 0,
    kiExtraAttack: false,
    stunningFistActive: false,
    stunningFistCondition: 'stunned',
  }
}

export function createDefaultRogueMechanics(): RogueMechanicsState {
  return {
    debilitatingInjury: null,
    underhandedAvailable: true,
    halflingDaggerCritBonusActive: true,
    underhandedReady: false,
    halflingDaggerCritBonus: 3,
  }
}

/**
 * Returns default class mechanics for a character based on character ID and/or class name.
 */
export function getDefaultClassMechanics(characterId: string, className?: string): ClassMechanicsState {
  const cls = (className ?? '').trim().toLowerCase()
  const id = characterId.trim().toLowerCase()

  const mechanics: ClassMechanicsState = {}

  if (id === 'noorie' || /druid|shifter/i.test(cls)) {
    const druid = createDefaultDruidMechanics()
    mechanics.druid = druid
    mechanics.wildShape = druid
  }
  if (id === 'shotrix-blackburn' || /magus/i.test(cls)) {
    mechanics.magus = createDefaultMagusMechanics()
  }
  if (id === 'knam' || /bloodrager|barbarian/i.test(cls)) {
    mechanics.bloodrager = createDefaultBloodragerMechanics()
  }
  if (id === 'mazikeen-noctis' || /witch/i.test(cls)) {
    mechanics.witch = createDefaultWitchMechanics()
  }
  if (id === 'agelmund' || /monk|ninja/i.test(cls)) {
    mechanics.monk = createDefaultMonkMechanics()
  }
  if (id === 'mariano-cardamomo' || /rogue|slayer/i.test(cls)) {
    mechanics.rogue = createDefaultRogueMechanics()
  }

  return mechanics
}

export const createDefaultClassMechanics = getDefaultClassMechanics

/**
 * Normalizes persisted class mechanics state to guarantee resilient schema.
 */
export function normalizeClassMechanics(
  persisted: ClassMechanicsState | undefined,
  characterId: string,
  className?: string
): ClassMechanicsState {
  const defaults = getDefaultClassMechanics(characterId, className)
  if (!persisted) return defaults

  const pDruid = persisted.druid ?? persisted.wildShape
  const normalizedDruid: DruidMechanicsState | undefined = pDruid
    ? {
        active: Boolean(pDruid.active ?? pDruid.wildShapeActive),
        formId: pDruid.formId ?? pDruid.currentFormId ?? null,
        meldedArmor: Boolean(pDruid.meldedArmor),
        hasNaturalSpellFeat: Boolean(pDruid.hasNaturalSpellFeat),
        wildShapeActive: Boolean(pDruid.active ?? pDruid.wildShapeActive),
        currentFormId: pDruid.formId ?? pDruid.currentFormId ?? null,
        activeForm: pDruid.activeForm ?? null,
      }
    : defaults.druid

  const normalizedMagus: MagusMechanicsState | undefined = persisted.magus
    ? {
        heldSpellstrike: persisted.magus.heldSpellstrike ?? null,
        spellCombatActive: Boolean(persisted.magus.spellCombatActive),
        defensiveCastingSacrifice: Math.max(0, Math.min(4, Number(persisted.magus.defensiveCastingSacrifice) || 0)),
        arcanePoolWeapon: persisted.magus.arcanePoolWeapon ?? (persisted.magus.arcaneWeaponActive ? {
          active: Boolean(persisted.magus.arcaneWeaponActive),
          bonus: Number(persisted.magus.arcaneWeaponBonus) || 1,
          remainingRounds: Math.max(0, Number(persisted.magus.arcaneWeaponRoundsLeft) || 0),
        } : null),
        arcaneWeaponActive: Boolean(persisted.magus.arcanePoolWeapon?.active ?? persisted.magus.arcaneWeaponActive),
        arcaneWeaponRoundsLeft: Math.max(0, Number(persisted.magus.arcanePoolWeapon?.remainingRounds ?? persisted.magus.arcaneWeaponRoundsLeft) || 0),
        arcaneWeaponBonus: Number(persisted.magus.arcanePoolWeapon?.bonus ?? persisted.magus.arcaneWeaponBonus) || 1,
      }
    : defaults.magus

  const pBlood = persisted.bloodrager
  const normalizedBloodrager: BloodragerMechanicsState | undefined = pBlood
    ? {
        isRaging: Boolean(pBlood.isRaging ?? pBlood.isBloodraging),
        roundsRagedThisCombat: Math.max(0, Number(pBlood.roundsRagedThisCombat ?? pBlood.roundsCurrentRage) || 0),
        fatigueCountdown: Math.max(0, Number(pBlood.fatigueCountdown ?? pBlood.fatigueRoundsLeft) || 0),
        aberrantReachActive: Boolean(pBlood.aberrantReachActive),
        staggeringStrikeUsesRemaining: Math.max(0, Number(pBlood.staggeringStrikeUsesRemaining ?? (5 - (pBlood.staggeringStrikeUsesSpent ?? 0))) || 0),
        furiousFocusAppliedThisRound: Boolean(pBlood.furiousFocusAppliedThisRound ?? !pBlood.furiousFocusReady),
        isBloodraging: Boolean(pBlood.isRaging ?? pBlood.isBloodraging),
        roundsCurrentRage: Math.max(0, Number(pBlood.roundsRagedThisCombat ?? pBlood.roundsCurrentRage) || 0),
        fatigueRoundsLeft: Math.max(0, Number(pBlood.fatigueCountdown ?? pBlood.fatigueRoundsLeft) || 0),
        furiousFocusReady: pBlood.furiousFocusReady ?? !pBlood.furiousFocusAppliedThisRound,
        staggeringStrikeUsesSpent: Math.max(0, Number(pBlood.staggeringStrikeUsesSpent ?? (5 - (pBlood.staggeringStrikeUsesRemaining ?? 5))) || 0),
      }
    : defaults.bloodrager

  const pWitch = persisted.witch
  const normalizedWitch: WitchMechanicsState | undefined = pWitch
    ? {
        cackleUsedThisRound: Boolean(pWitch.cackleUsedThisRound),
        activeHexes: Array.isArray(pWitch.activeHexes)
          ? pWitch.activeHexes.map((h) => ({
              ...h,
              hexType: h.hexType ?? h.type ?? 'evil-eye',
              type: h.type ?? h.hexType ?? 'evil-eye',
              remainingRounds: Math.max(0, Number(h.remainingRounds ?? h.durationRounds) || 0),
              durationRounds: Math.max(0, Number(h.durationRounds ?? h.remainingRounds) || 0),
              isExtendableByCackle: Boolean(h.isExtendableByCackle ?? h.isCackleable ?? h.cackleExtendable ?? true),
              isCackleable: Boolean(h.isExtendableByCackle ?? h.isCackleable ?? h.cackleExtendable ?? true),
              cackleExtendable: Boolean(h.isExtendableByCackle ?? h.isCackleable ?? h.cackleExtendable ?? true),
            }))
          : [],
        immuneTargets: pWitch.immuneTargets ?? {},
        targetImmunities: Array.isArray(pWitch.targetImmunities) ? pWitch.targetImmunities : [],
      }
    : defaults.witch

  const pMonk = persisted.monk
  const normalizedMonk: MonkMechanicsState | undefined = pMonk
    ? {
        kiDefenseRounds: Math.max(0, Number(pMonk.kiDefenseRounds ?? pMonk.kiDefenseRoundsLeft) || 0),
        kiSpeedRounds: Math.max(0, Number(pMonk.kiSpeedRounds ?? pMonk.kiSpeedRoundsLeft) || 0),
        kiExtraAttackActive: Boolean(pMonk.kiExtraAttackActive ?? pMonk.kiExtraAttack),
        stunningFistDeclared: pMonk.stunningFistDeclared ?? (pMonk.stunningFistActive ? (pMonk.stunningFistCondition ?? 'stunned') : null),
        jabbingStyleActive: Boolean(pMonk.jabbingStyleActive),
        stunningFistDc: Number(pMonk.stunningFistDc) || 14,
        kiDefenseRoundsLeft: Math.max(0, Number(pMonk.kiDefenseRounds ?? pMonk.kiDefenseRoundsLeft) || 0),
        kiSpeedRoundsLeft: Math.max(0, Number(pMonk.kiSpeedRounds ?? pMonk.kiSpeedRoundsLeft) || 0),
        kiExtraAttack: Boolean(pMonk.kiExtraAttackActive ?? pMonk.kiExtraAttack),
        stunningFistActive: Boolean(pMonk.stunningFistDeclared || pMonk.stunningFistActive),
        stunningFistCondition: pMonk.stunningFistCondition ?? (pMonk.stunningFistDeclared === 'fatigued' ? 'fatigued' : 'stunned'),
      }
    : defaults.monk

  const pRogue = persisted.rogue
  const normalizedRogue: RogueMechanicsState | undefined = pRogue
    ? {
        debilitatingInjury: pRogue.debilitatingInjury
          ? {
              active: pRogue.debilitatingInjury.active ?? true,
              type: pRogue.debilitatingInjury.type ?? pRogue.debilitatingInjury.mode ?? 'bewildered',
              mode: pRogue.debilitatingInjury.mode ?? pRogue.debilitatingInjury.type ?? 'bewildered',
              remainingRounds: Math.max(0, Number(pRogue.debilitatingInjury.remainingRounds ?? pRogue.debilitatingInjury.roundsLeft) || 1),
              roundsLeft: Math.max(0, Number(pRogue.debilitatingInjury.roundsLeft ?? pRogue.debilitatingInjury.remainingRounds) || 1),
              targetName: pRogue.debilitatingInjury.targetName,
            }
          : null,
        underhandedAvailable: pRogue.underhandedAvailable ?? true,
        halflingDaggerCritBonusActive: pRogue.halflingDaggerCritBonusActive ?? true,
        underhandedReady: Boolean(pRogue.underhandedReady),
        halflingDaggerCritBonus: Number(pRogue.halflingDaggerCritBonus) || 3,
      }
    : defaults.rogue

  const result: ClassMechanicsState = {}
  if (normalizedDruid) {
    result.druid = normalizedDruid
    result.wildShape = normalizedDruid
  }
  if (normalizedMagus) result.magus = normalizedMagus
  if (normalizedBloodrager) result.bloodrager = normalizedBloodrager
  if (normalizedWitch) result.witch = normalizedWitch
  if (normalizedMonk) result.monk = normalizedMonk
  if (normalizedRogue) result.rogue = normalizedRogue

  return result
}

/**
 * Resets per-day and combat-only class mechanics upon taking a Long Rest.
 */
export function resetClassMechanicsOnLongRest(
  state: ClassMechanicsState | undefined,
  characterId: string,
  className?: string
): ClassMechanicsState {
  const norm = normalizeClassMechanics(state, characterId, className)

  const result: ClassMechanicsState = {}

  if (norm.druid) {
    const druid = {
      ...norm.druid,
      active: false,
      formId: null,
      wildShapeActive: false,
      currentFormId: null,
      activeForm: null,
    }
    result.druid = druid
    result.wildShape = druid
  }

  if (norm.magus) {
    result.magus = {
      ...norm.magus,
      heldSpellstrike: null,
      spellCombatActive: false,
      defensiveCastingSacrifice: 0,
      arcanePoolWeapon: null,
      arcaneWeaponActive: false,
      arcaneWeaponRoundsLeft: 0,
      arcaneWeaponBonus: 1,
    }
  }

  if (norm.bloodrager) {
    result.bloodrager = {
      ...norm.bloodrager,
      isRaging: false,
      roundsRagedThisCombat: 0,
      fatigueCountdown: 0,
      aberrantReachActive: false,
      staggeringStrikeUsesRemaining: 5,
      furiousFocusAppliedThisRound: false,
      isBloodraging: false,
      roundsCurrentRage: 0,
      fatigueRoundsLeft: 0,
      furiousFocusReady: true,
      staggeringStrikeUsesSpent: 0,
    }
  }

  if (norm.witch) {
    result.witch = {
      ...norm.witch,
      cackleUsedThisRound: false,
      activeHexes: [],
      immuneTargets: {}, // 24-hour immunity clears on Long Rest
      targetImmunities: [],
    }
  }

  if (norm.monk) {
    result.monk = {
      ...norm.monk,
      kiDefenseRounds: 0,
      kiSpeedRounds: 0,
      kiExtraAttackActive: false,
      stunningFistDeclared: null,
      jabbingStyleActive: false,
      kiDefenseRoundsLeft: 0,
      kiSpeedRoundsLeft: 0,
      kiExtraAttack: false,
      stunningFistActive: false,
    }
  }

  if (norm.rogue) {
    result.rogue = {
      ...norm.rogue,
      debilitatingInjury: null,
      underhandedAvailable: true,
      underhandedReady: false,
    }
  }

  return result
}
