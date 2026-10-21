import type { FullCharacter } from '../../src/store/useCharacterStore'
import type { SessionState } from '../../src/types/session'
import { useCharacterStore } from '../../src/store/useCharacterStore'
import { useSessionStore } from '../../src/store/useSessionStore'
import { useDiceStore } from '../../src/store/useDiceStore'

// ---------------------------------------------------------------------------
// 1. Monk: Agelmund (Level 4, STR 20, WIS 14, Ki Pool, Flurry of Blows, Evasion)
// ---------------------------------------------------------------------------
export const monkChar: FullCharacter = {
  id: 'monk-agelmund',
  name: 'Agelmund',
  class: 'Monk',
  level: 4,
  race: 'Human',
  alignment: 'Lawful Neutral',
  maxHp: 36,
  initiativeBonus: 2,
  speed: 40,
  abilities: { str: 20, dex: 14, con: 14, int: 8, wis: 14, cha: 12 },
  baseAttackBonus: [3],
  armorClass: {
    total: 16,
    touch: 14,
    flatFooted: 14,
    armorBonus: 0,
    shieldBonus: 0,
    dexBonus: 2,
    naturalArmor: 0,
    deflection: 0,
    misc: 4, // Monk AC bonus (+2 WIS + 2 Monk level bonus/misc)
    spellFailureChance: 0,
  },
  savingThrows: {
    fort: 6,
    ref: 6,
    will: 6,
    fortBase: 4,
    refBase: 4,
    willBase: 4,
  },
  skills: [],
  weapons: [
    {
      id: 'weap-unarmed',
      name: 'Unarmed Strike',
      type: 'melee',
      attackBonus: [8],
      damageDice: '1d8',
      damageBonus: 5,
      critRange: 20,
      critMultiplier: 2,
      tags: ['Unarmed', 'Monk'],
    },
    {
      id: 'weap-flurry',
      name: 'Flurry of Blows',
      type: 'melee',
      attackBonus: [7, 7],
      damageDice: '1d8',
      damageBonus: 5,
      critRange: 20,
      critMultiplier: 2,
      tags: ['Unarmed', 'Monk', 'Full-Round'],
    },
  ],
  buffs: [
    {
      id: 'buff-ki-strike',
      name: 'Ki Strike (Magic)',
      description: 'Unarmed attacks treated as magic',
      active: false,
      attackMod: 0,
      damageMod: 0,
      acMod: 0,
      color: 'primary',
    },
    {
      id: 'buff-ki-dodge',
      name: 'Ki Dodge',
      description: '+4 dodge bonus to AC for 1 round',
      active: false,
      attackMod: 0,
      damageMod: 0,
      acMod: 4,
      color: 'secondary',
    },
  ],
  dailyResources: [
    { id: 'ki-pool', name: 'Ki Pool', total: 4, label: 'Ki' },
    { id: 'stunning-fist', name: 'Stunning Fist', total: 4, label: 'Stun' },
  ],
  feats: [
    {
      id: 'feat-power-attack',
      index: 0,
      name: 'Power Attack',
      shortDesc: 'Trade attack bonus for extra damage',
      fullDesc: 'Can take -1 penalty on attack rolls to add +2 damage (+3 with two hands).',
    },
    {
      id: 'feat-dodge',
      index: 1,
      name: 'Dodge',
      shortDesc: '+1 dodge bonus to AC',
      fullDesc: 'You gain a +1 dodge bonus to your AC.',
    },
  ],
  classAbilities: [
    {
      id: 'ca-flurry',
      name: 'Flurry of Blows',
      description: 'Make extra attack in full attack standard action.',
      isSignature: true,
    },
    {
      id: 'ca-ki-pool',
      name: 'Ki Pool',
      description: 'Spend 1 ki point as swift action to gain extra attack or +4 AC dodge.',
    },
    {
      id: 'ca-evasion',
      name: 'Evasion',
      description: 'Take no damage on successful Reflex saving throw.',
    },
    {
      id: 'ca-fast-movement',
      name: 'Fast Movement',
      description: '+10 ft enhancement bonus to land speed.',
    },
  ],
  spellSlots: [],
  spells: [],
  inventory: [],
}

// ---------------------------------------------------------------------------
// 2. Magus: Mazikeen Noctis (Level 4, INT 18, DEX 18, Shocking Grasp, Arcane Pool)
// ---------------------------------------------------------------------------
export const magusChar: FullCharacter = {
  id: 'magus-mazikeen',
  name: 'Mazikeen Noctis',
  class: 'Magus (Kensai)',
  level: 4,
  race: 'Tiefling',
  alignment: 'True Neutral',
  maxHp: 38,
  initiativeBonus: 7,
  speed: 30,
  abilities: { str: 10, dex: 18, con: 14, int: 18, wis: 12, cha: 8 },
  baseAttackBonus: [3],
  armorClass: {
    total: 18,
    touch: 14,
    flatFooted: 14,
    armorBonus: 0,
    shieldBonus: 0,
    dexBonus: 4,
    naturalArmor: 0,
    deflection: 0,
    misc: 4, // Canny Defense (INT bonus to AC)
    spellFailureChance: 0,
  },
  savingThrows: {
    fort: 6,
    ref: 5,
    will: 5,
    fortBase: 4,
    refBase: 1,
    willBase: 4,
  },
  skills: [],
  weapons: [
    {
      id: 'weap-scimitar',
      name: '+1 Scimitar',
      type: 'melee',
      attackBonus: [8],
      damageDice: '1d6',
      damageBonus: 5,
      critRange: 18,
      critMultiplier: 2,
      tags: ['Finesse', 'Slash'],
    },
  ],
  buffs: [
    {
      id: 'buff-arcane-weapon',
      name: 'Arcane Weapon Enhancement',
      description: 'Add +1 enhancement bonus to weapon for 1 minute',
      active: false,
      attackMod: 1,
      damageMod: 1,
      acMod: 0,
      color: 'primary',
    },
    {
      id: 'buff-shield-spell',
      name: 'Shield Spell',
      description: '+4 shield bonus to AC and immune to magic missile',
      active: false,
      attackMod: 0,
      damageMod: 0,
      acMod: 4,
      duration: '4 minutes',
      color: 'secondary',
    },
  ],
  dailyResources: [
    { id: 'arcane-pool', name: 'Arcane Pool', total: 6, label: 'Pool' },
  ],
  feats: [
    {
      id: 'feat-weapon-finesse',
      index: 0,
      name: 'Weapon Finesse',
      shortDesc: 'Use DEX for melee attack rolls',
      fullDesc: 'With a light weapon, you may use your Dexterity modifier instead of Strength.',
    },
    {
      id: 'feat-combat-casting',
      index: 1,
      name: 'Combat Casting',
      shortDesc: '+4 Concentration on defensive casting',
      fullDesc: 'You get a +4 bonus on concentration checks made while casting defensively.',
    },
  ],
  classAbilities: [
    {
      id: 'ca-spell-combat',
      name: 'Spell Combat',
      description: 'Cast spell with off-hand and make weapon attacks.',
      isSignature: true,
    },
    {
      id: 'ca-spellstrike',
      name: 'Spellstrike',
      description: 'Deliver touch spells through weapon attack.',
    },
  ],
  spellSlots: [
    { level: 1, total: 4 },
    { level: 2, total: 2 },
  ],
  spells: [
    {
      id: 'spell-shocking-grasp',
      name: 'Shocking Grasp',
      level: 1,
      school: 'Evocation',
      castingTime: '1 standard action',
      range: 'Touch',
      duration: 'Instantaneous',
      savingThrow: 'None',
      spellResistance: true,
      components: 'V, S',
      description: 'Touch attack deals 4d6 electrical damage (+3 attack vs metal).',
      attackType: 'meleeTouch',
      damageDice: '4d6',
      damageBonus: 0,
    },
    {
      id: 'spell-shield',
      name: 'Shield',
      level: 1,
      school: 'Abjuration',
      castingTime: '1 standard action',
      range: 'Personal',
      duration: '4 minutes',
      spellResistance: false,
      components: 'V, S',
      description: 'Invisible shield grants +4 shield AC bonus.',
    },
    {
      id: 'spell-scorching-ray',
      name: 'Scorching Ray',
      level: 2,
      school: 'Evocation',
      castingTime: '1 standard action',
      range: 'Close',
      duration: 'Instantaneous',
      savingThrow: 'None',
      spellResistance: true,
      components: 'V, S',
      description: 'Ranged touch ray deals 4d6 fire damage.',
      attackType: 'ray',
      damageDice: '4d6',
      damageBonus: 0,
    },
  ],
  inventory: [],
}

// ---------------------------------------------------------------------------
// 3. Inquisitor: Valerius Thorne (Level 12, High HP, Judgment, Cure Spells)
// ---------------------------------------------------------------------------
export const inquisitorChar: FullCharacter = {
  id: 'inquisitor-valerius',
  name: 'Valerius Thorne',
  class: 'Inquisitor',
  level: 12,
  race: 'Human',
  alignment: 'Lawful Neutral',
  maxHp: 102,
  initiativeBonus: 8,
  speed: 30,
  abilities: { str: 18, dex: 14, con: 16, int: 12, wis: 20, cha: 10 },
  baseAttackBonus: [9, 4],
  armorClass: {
    total: 26,
    touch: 12,
    flatFooted: 24,
    armorBonus: 9,
    shieldBonus: 3,
    dexBonus: 2,
    naturalArmor: 1,
    deflection: 1,
    misc: 0,
    spellFailureChance: 0,
  },
  savingThrows: {
    fort: 11,
    ref: 6,
    will: 13,
    fortBase: 8,
    refBase: 4,
    willBase: 8,
  },
  skills: [],
  weapons: [
    {
      id: 'weap-greatsword',
      name: '+2 Greatsword',
      type: 'melee',
      attackBonus: [15, 10],
      damageDice: '2d6',
      damageBonus: 8,
      critRange: 19,
      critMultiplier: 2,
      tags: ['Two-Handed'],
    },
  ],
  buffs: [
    {
      id: 'buff-judgment-destruction',
      name: 'Judgment: Destruction',
      description: '+4 sacred bonus to all weapon damage rolls',
      active: false,
      attackMod: 0,
      damageMod: 4,
      acMod: 0,
      color: 'secondary',
    },
    {
      id: 'buff-divine-favor',
      name: 'Divine Favor',
      description: '+3 luck bonus on attack and weapon damage rolls',
      active: false,
      attackMod: 3,
      damageMod: 3,
      acMod: 0,
      duration: '1 minute',
      color: 'primary',
    },
  ],
  dailyResources: [
    { id: 'judgment', name: 'Judgment', total: 4, label: 'Judgment' },
    { id: 'bane', name: 'Bane', total: 12, label: 'Bane' },
  ],
  feats: [
    {
      id: 'feat-power-attack',
      index: 0,
      name: 'Power Attack',
      shortDesc: 'Trade attack for damage',
      fullDesc: 'Take penalty to attack to add extra damage.',
    },
  ],
  classAbilities: [
    {
      id: 'ca-judgment',
      name: 'Judgment',
      description: 'Pronounce judgment upon foes as swift action.',
      isSignature: true,
    },
    {
      id: 'ca-stern-gaze',
      name: 'Stern Gaze',
      description: '+6 morale bonus on Intimidate and Sense Motive.',
    },
  ],
  spellSlots: [
    { level: 1, total: 6 },
    { level: 2, total: 5 },
  ],
  spells: [
    {
      id: 'spell-cure-moderate',
      name: 'Cure Moderate Wounds',
      level: 2,
      school: 'Conjuration',
      castingTime: '1 standard action',
      range: 'Touch',
      duration: 'Instantaneous',
      savingThrow: 'Will half',
      spellResistance: true,
      components: 'V, S',
      description: 'Heals 2d8+10 damage on living creature.',
      damageDice: '2d8',
      damageBonus: 10,
    },
  ],
  inventory: [],
}

// ---------------------------------------------------------------------------
// 4. Rogue: Mariano Cardamomo (Level 4, Halfling, STR 6 (-2), DEX 20 (+5), Evasion)
// ---------------------------------------------------------------------------
export const rogueChar: FullCharacter = {
  id: 'rogue-mariano',
  name: 'Mariano Cardamomo',
  class: 'Rogue',
  level: 4,
  race: 'Halfling',
  alignment: 'Chaotic Evil',
  maxHp: 39,
  initiativeBonus: 7,
  speed: 20,
  abilities: { str: 6, dex: 20, con: 16, int: 18, wis: 14, cha: 17 },
  baseAttackBonus: [3],
  armorClass: {
    total: 20,
    touch: 16,
    flatFooted: 15,
    armorBonus: 4,
    shieldBonus: 0,
    dexBonus: 5,
    naturalArmor: 0,
    deflection: 0,
    misc: 1, // Halfling size bonus
    spellFailureChance: 0,
  },
  savingThrows: {
    fort: 5,
    ref: 10,
    will: 4,
    fortBase: 1,
    refBase: 4,
    willBase: 1,
  },
  skills: [],
  weapons: [
    {
      id: 'weap-dagger',
      name: 'Masterwork Dagger',
      type: 'melee',
      attackBonus: [9], // BAB 3 + DEX 5 + Size 1 = 9
      damageDice: '1d4',
      damageBonus: -2, // STR 6 -> modifier -2!
      critRange: 19,
      critMultiplier: 2,
      tags: ['Finesse', 'Light'],
    },
  ],
  buffs: [
    {
      id: 'buff-sneak-attack',
      name: 'Sneak Attack',
      description: 'Extra +2d6 precision damage',
      active: false,
      attackMod: 0,
      damageMod: 0,
      extraDamageDice: '2d6',
      acMod: 0,
      color: 'primary',
    },
  ],
  dailyResources: [],
  feats: [
    {
      id: 'feat-weapon-finesse',
      index: 0,
      name: 'Weapon Finesse',
      shortDesc: 'Use DEX for attack rolls',
      fullDesc: 'Use DEX modifier instead of STR modifier on melee attacks.',
    },
  ],
  classAbilities: [
    {
      id: 'ca-evasion',
      name: 'Evasion',
      description: 'No damage on successful Reflex save against area attacks.',
      isSignature: true,
    },
    {
      id: 'ca-uncanny-dodge',
      name: 'Uncanny Dodge',
      description: 'Cannot be caught flat-footed, retains DEX bonus to AC.',
    },
  ],
  spellSlots: [],
  spells: [],
  inventory: [],
}

// ---------------------------------------------------------------------------
// Store Reset and Character Setup Utilities
// ---------------------------------------------------------------------------
export function resetTestStores() {
  useCharacterStore.setState({
    characters: [monkChar, magusChar, inquisitorChar, rogueChar],
    activeCharacterId: 'magus-mazikeen',
  })
  useDiceStore.setState({
    isOpen: false,
    isRolling: false,
    pendingRoll: null,
    lastResult: null,
    history: [],
  })
  useSessionStore.setState({
    sessions: {},
  })
}

export function setupTestSession(
  charId: string,
  overrides?: Partial<SessionState>
): SessionState {
  const currentSessions = useSessionStore.getState().sessions
  const baseSession: SessionState = {
    characterId: charId,
    currentHp:
      charId === monkChar.id
        ? monkChar.maxHp
        : charId === magusChar.id
        ? magusChar.maxHp
        : charId === inquisitorChar.id
        ? inquisitorChar.maxHp
        : rogueChar.maxHp,
    tempHp: 0,
    nonlethalDamage: 0,
    spentResources: {},
    activeBuffIds: [],
    conditions: [],
    customBuffs: [],
    preparedSpellIds: [],
    spentSpellSlots: {},
    ammo: {},
    activeSummon: null,
    itemQuantities: {},
    coins: { gp: 100, sp: 20, cp: 0 },
    ...overrides,
  }

  useSessionStore.setState({
    sessions: {
      ...currentSessions,
      [charId]: baseSession,
    },
  })

  useCharacterStore.setState({
    activeCharacterId: charId,
  })

  return baseSession
}

// ---------------------------------------------------------------------------
// Pure Pathfinder 1e Mathematical Reference Functions (Authoritative Oracle)
// ---------------------------------------------------------------------------
export function deriveSpellDc(spellLevel: number, castingMod: number, bonus = 0): number {
  return 10 + spellLevel + castingMod + bonus
}

export function deriveConcentrationBonus(casterLevel: number, castingMod: number, hasCombatCasting = false): number {
  return casterLevel + castingMod + (hasCombatCasting ? 4 : 0)
}

export function deriveCastingAbilityKey(className: string): 'int' | 'wis' | 'cha' {
  const cls = className.toLowerCase()
  if (/wizard|magus|witch|alchemist|investigator|arcanist/.test(cls)) return 'int'
  if (/sorcerer|bard|oracle|summoner|skald|bloodrager|paladin/.test(cls)) return 'cha'
  return 'wis'
}
