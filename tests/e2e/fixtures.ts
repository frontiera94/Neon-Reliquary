import type { FullCharacter } from "../../src/store/useCharacterStore"
import type { SessionState } from "../../src/types/session"
import type { ArmorClass } from "../../src/types/defense"
import { useCharacterStore } from "../../src/store/useCharacterStore"
import { useSessionStore } from "../../src/store/useSessionStore"
import { useDiceStore } from "../../src/store/useDiceStore"

// ---------------------------------------------------------------------------
// 1. Wild Shape Preset Definitions (Beast Shape I)
// ---------------------------------------------------------------------------
export type WildShapeFormId =
  | "wolf"
  | "leopard"
  | "black-bear"
  | "deinonychus"
  | "crocodile"
  | "eagle"
  | "octopus"

export interface NaturalAttackDef {
  name: string
  isPrimary: boolean
  damageDice: string
  attackCount: number
  strMultiplier: number // 1.5 for sole bite, 1.0 for primary, 0.5 for secondary
  attackBonusMod: number // 0 for primary, -5 for secondary
  trip?: boolean
  grab?: boolean
}

export interface WildShapePreset {
  id: WildShapeFormId
  name: string
  size: "Small" | "Medium"
  strBonus: number
  dexBonus: number
  naturalArmorBonus: number
  sizeAcBonus: number
  sizeAtkBonus: number
  sizeCmbCmdMod: number
  stealthBonus: number
  speed: number
  specialSpeeds?: {
    fly?: { speed: number; maneuverability: "average" | "good" }
    swim?: number
    climb?: number
    jet?: number
  }
  senses: string[]
  naturalAttacks: NaturalAttackDef[]
  specialAbilities?: string[]
}

export const WILD_SHAPE_PRESETS: Record<WildShapeFormId, WildShapePreset> = {
  wolf: {
    id: "wolf",
    name: "Wolf",
    size: "Medium",
    strBonus: 2,
    dexBonus: 0,
    naturalArmorBonus: 2,
    sizeAcBonus: 0,
    sizeAtkBonus: 0,
    sizeCmbCmdMod: 0,
    stealthBonus: 0,
    speed: 50,
    senses: ["Low-light vision", "Scent"],
    naturalAttacks: [
      {
        name: "Bite",
        isPrimary: true,
        damageDice: "1d6",
        attackCount: 1,
        strMultiplier: 1.5, // Sole natural attack
        attackBonusMod: 0,
        trip: true,
      },
    ],
    specialAbilities: ["Trip"],
  },
  leopard: {
    id: "leopard",
    name: "Leopard",
    size: "Medium",
    strBonus: 2,
    dexBonus: 0,
    naturalArmorBonus: 2,
    sizeAcBonus: 0,
    sizeAtkBonus: 0,
    sizeCmbCmdMod: 0,
    stealthBonus: 0,
    speed: 30,
    specialSpeeds: { climb: 20 },
    senses: ["Low-light vision", "Scent"],
    naturalAttacks: [
      {
        name: "Bite",
        isPrimary: true,
        damageDice: "1d6",
        attackCount: 1,
        strMultiplier: 1.0,
        attackBonusMod: 0,
        grab: true,
      },
      {
        name: "Claw",
        isPrimary: true,
        damageDice: "1d3",
        attackCount: 2,
        strMultiplier: 1.0,
        attackBonusMod: 0,
      },
    ],
    specialAbilities: ["Pounce", "Grab"],
  },
  "black-bear": {
    id: "black-bear",
    name: "Black Bear",
    size: "Medium",
    strBonus: 2,
    dexBonus: 0,
    naturalArmorBonus: 2,
    sizeAcBonus: 0,
    sizeAtkBonus: 0,
    sizeCmbCmdMod: 0,
    stealthBonus: 0,
    speed: 40,
    senses: ["Low-light vision", "Scent"],
    naturalAttacks: [
      {
        name: "Bite",
        isPrimary: true,
        damageDice: "1d6",
        attackCount: 1,
        strMultiplier: 1.0,
        attackBonusMod: 0,
      },
      {
        name: "Claw",
        isPrimary: true,
        damageDice: "1d4",
        attackCount: 2,
        strMultiplier: 1.0,
        attackBonusMod: 0,
      },
    ],
  },
  deinonychus: {
    id: "deinonychus",
    name: "Deinonychus",
    size: "Medium",
    strBonus: 2,
    dexBonus: 0,
    naturalArmorBonus: 2,
    sizeAcBonus: 0,
    sizeAtkBonus: 0,
    sizeCmbCmdMod: 0,
    stealthBonus: 0,
    speed: 60,
    senses: ["Low-light vision", "Scent"],
    naturalAttacks: [
      {
        name: "Talons",
        isPrimary: true,
        damageDice: "1d8",
        attackCount: 2,
        strMultiplier: 1.0,
        attackBonusMod: 0,
      },
      {
        name: "Bite",
        isPrimary: true,
        damageDice: "1d6",
        attackCount: 1,
        strMultiplier: 1.0,
        attackBonusMod: 0,
      },
      {
        name: "Foreclaws",
        isPrimary: false,
        damageDice: "1d4",
        attackCount: 2,
        strMultiplier: 0.5,
        attackBonusMod: -5,
      },
    ],
    specialAbilities: ["Pounce"],
  },
  crocodile: {
    id: "crocodile",
    name: "Crocodile",
    size: "Medium",
    strBonus: 2,
    dexBonus: 0,
    naturalArmorBonus: 2,
    sizeAcBonus: 0,
    sizeAtkBonus: 0,
    sizeCmbCmdMod: 0,
    stealthBonus: 0,
    speed: 20,
    specialSpeeds: { swim: 30 },
    senses: ["Low-light vision"],
    naturalAttacks: [
      {
        name: "Bite",
        isPrimary: true,
        damageDice: "1d8",
        attackCount: 1,
        strMultiplier: 1.0,
        attackBonusMod: 0,
        grab: true,
      },
      {
        name: "Tail Slap",
        isPrimary: false,
        damageDice: "1d12",
        attackCount: 1,
        strMultiplier: 0.5,
        attackBonusMod: -5,
      },
    ],
    specialAbilities: ["Grab", "Sprint"],
  },
  eagle: {
    id: "eagle",
    name: "Eagle",
    size: "Small",
    strBonus: 0,
    dexBonus: 2,
    naturalArmorBonus: 1,
    sizeAcBonus: 1,
    sizeAtkBonus: 1,
    sizeCmbCmdMod: -1,
    stealthBonus: 4,
    speed: 10,
    specialSpeeds: { fly: { speed: 80, maneuverability: "average" } },
    senses: ["Low-light vision"],
    naturalAttacks: [
      {
        name: "Talons",
        isPrimary: true,
        damageDice: "1d4",
        attackCount: 2,
        strMultiplier: 1.0,
        attackBonusMod: 0,
      },
      {
        name: "Bite",
        isPrimary: true,
        damageDice: "1d4",
        attackCount: 1,
        strMultiplier: 1.0,
        attackBonusMod: 0,
      },
    ],
  },
  octopus: {
    id: "octopus",
    name: "Octopus",
    size: "Small",
    strBonus: 0,
    dexBonus: 2,
    naturalArmorBonus: 1,
    sizeAcBonus: 1,
    sizeAtkBonus: 1,
    sizeCmbCmdMod: -1,
    stealthBonus: 4,
    speed: 20,
    specialSpeeds: { swim: 30, jet: 200 },
    senses: ["Low-light vision"],
    naturalAttacks: [
      {
        name: "Bite",
        isPrimary: true,
        damageDice: "1d3",
        attackCount: 1,
        strMultiplier: 1.0,
        attackBonusMod: 0,
      },
      {
        name: "Tentacles",
        isPrimary: false,
        damageDice: "1d4",
        attackCount: 1,
        strMultiplier: 0.5,
        attackBonusMod: -5,
        grab: true,
      },
    ],
    specialAbilities: ["Grab", "Ink Cloud"],
  },
}

// ---------------------------------------------------------------------------
// 2. Active Party Baseline Characters (PF1e Level 4-5)
// ---------------------------------------------------------------------------
export const noorieChar: FullCharacter = {
  id: "noorie",
  name: "Noorie",
  class: "Druid",
  level: 4,
  race: "Human",
  alignment: "Neutral Evil",
  maxHp: 36,
  initiativeBonus: 7,
  speed: 30,
  abilities: { str: 12, dex: 16, con: 13, int: 12, wis: 20, cha: 11 },
  baseAttackBonus: [3],
  armorClass: {
    total: 15,
    touch: 13,
    flatFooted: 12,
    armorBonus: 2,
    shieldBonus: 0,
    dexBonus: 3,
    naturalArmor: 0,
    deflection: 0,
    misc: 0,
    spellFailureChance: 10,
  },
  savingThrows: {
    fort: 5,
    ref: 4,
    will: 9,
    fortBase: 4,
    refBase: 1,
    willBase: 4,
  },
  skills: [],
  weapons: [
    {
      id: "weap-fire-bolt",
      name: "Fire Bolt",
      type: "ranged",
      attackBonus: [6],
      damageDice: "1d6",
      damageBonus: 2,
      critRange: 20,
      critMultiplier: 2,
      tags: ["Domain", "Ranged Touch"],
    },
    {
      id: "weap-scythe",
      name: "Scythe (Memento)",
      type: "melee",
      attackBonus: [4],
      damageDice: "2d4",
      damageBonus: 1,
      critRange: 20,
      critMultiplier: 4,
      tags: ["Two-Handed", "Trip"],
    },
    {
      id: "weap-sling",
      name: "Sling",
      type: "ranged",
      attackBonus: [6],
      damageDice: "1d4",
      damageBonus: 1,
      critRange: 20,
      critMultiplier: 2,
      tags: ["Ranged"],
    },
  ],
  buffs: [
    {
      id: "barkskin",
      name: "Barkskin",
      description: "+2 natural armor bonus",
      active: false,
      attackMod: 0,
      damageMod: 0,
      acMod: 2,
      color: "primary",
    },
  ],
  dailyResources: [
    { id: "wild-shape", name: "Wild Shape (4 hrs)", total: 1, label: "WS" },
    { id: "fire-bolt", name: "Fire Bolt", total: 8, label: "Bolt" },
  ],
  feats: [
    { id: "f1", index: 0, name: "Combat Casting", shortDesc: "+4 concentration defensively", fullDesc: "" },
    { id: "f2", index: 1, name: "Improved Initiative", shortDesc: "+4 initiative", fullDesc: "" },
  ],
  spells: [
    {
      id: "spell-flame-blade",
      name: "Flame Blade",
      level: 2,
      school: "Evocation",
      components: "V, S, DF",
      range: "0 ft",
      duration: "4 min",
      castingTime: "1 standard action",
      spellResistance: true,
      description: "Fiery blade deals 1d8+2 fire damage.",
    },
    {
      id: "spell-barkskin",
      name: "Barkskin",
      level: 2,
      school: "Transmutation",
      components: "V, S, DF",
      range: "Touch",
      duration: "40 min",
      castingTime: "1 standard action",
      spellResistance: false,
      description: "Grants +2 natural armor bonus.",
    },
  ],
  classAbilities: [],
  spellSlots: [],
  inventory: [],
}

export const shotrixChar: FullCharacter = {
  id: "shotrix-blackburn",
  name: "Shotrix Blackburn",
  class: "Magus",
  level: 4,
  race: "Human",
  alignment: "Lawful Evil",
  maxHp: 43,
  initiativeBonus: 4,
  speed: 30,
  abilities: { str: 10, dex: 18, con: 16, int: 18, wis: 13, cha: 7 },
  baseAttackBonus: [3],
  armorClass: {
    total: 17,
    touch: 14,
    flatFooted: 13,
    armorBonus: 3,
    shieldBonus: 0,
    dexBonus: 4,
    naturalArmor: 0,
    deflection: 0,
    misc: 0,
    spellFailureChance: 15,
  },
  savingThrows: {
    fort: 7,
    ref: 5,
    will: 5,
    fortBase: 4,
    refBase: 1,
    willBase: 4,
  },
  skills: [],
  weapons: [
    {
      id: "weap-rapier",
      name: "Rapier",
      type: "melee",
      attackBonus: [7], // BAB 3 + DEX 4 via Weapon Finesse
      damageDice: "1d6",
      damageBonus: 0,
      critRange: 18,
      critMultiplier: 2,
      tags: ["Weapon Finesse", "Spellstrike"],
    },
    {
      id: "weap-dagger-shotrix",
      name: "Dagger",
      type: "melee",
      attackBonus: [7],
      damageDice: "1d4",
      damageBonus: 0,
      critRange: 19,
      critMultiplier: 2,
      tags: ["Light", "Finesse"],
    },
  ],
  buffs: [
    {
      id: "arcane-weapon",
      name: "Arcane Pool Weapon Enhancement",
      description: "+1 enhancement to weapon for 10 rounds",
      active: false,
      attackMod: 1,
      damageMod: 1,
      acMod: 0,
      color: "primary",
    },
  ],
  dailyResources: [
    { id: "arcane-pool", name: "Arcane Pool", total: 6, label: "Pool" },
  ],
  feats: [
    { id: "f1", index: 0, name: "Weapon Finesse", shortDesc: "DEX to hit", fullDesc: "" },
    { id: "f2", index: 1, name: "Combat Casting", shortDesc: "+4 concentration defensively", fullDesc: "" },
  ],
  spells: [
    {
      id: "shocking-grasp",
      name: "Shocking Grasp",
      level: 1,
      school: "Evocation",
      components: "V, S",
      range: "Touch",
      duration: "Instantaneous",
      description: "Touch attack deals 4d6 electricity damage (+3 attack vs metal).",
      castingTime: "1 standard action",
      spellResistance: true,
      attackType: "meleeTouch",
      damageDice: "4d6",
      damageBonus: 0,
    },
    {
      id: "chill-touch",
      name: "Chill Touch",
      level: 1,
      school: "Necromancy",
      components: "V, S",
      range: "Touch",
      duration: "Instantaneous",
      description: "Deals 1d6 damage + 1 STR damage (4 charges at CL 4).",
      castingTime: "1 standard action",
      spellResistance: true,
      attackType: "meleeTouch",
      damageDice: "1d6",
      damageBonus: 0,
    },
    {
      id: "frostbite",
      name: "Frostbite",
      level: 1,
      school: "Transmutation",
      components: "V, S",
      range: "Touch",
      duration: "Instantaneous",
      description: "Deals 1d6+4 nonlethal cold damage + fatigued (4 charges at CL 4).",
      castingTime: "1 standard action",
      spellResistance: true,
      attackType: "meleeTouch",
      damageDice: "1d6",
      damageBonus: 4,
    },
  ],
  classAbilities: [],
  spellSlots: [],
  inventory: [],
}

export const knamChar: FullCharacter = {
  id: "knam",
  name: "Knam",
  class: "Bloodrager",
  level: 4,
  race: "Human",
  alignment: "Chaotic Evil",
  maxHp: 51,
  initiativeBonus: 2,
  speed: 40,
  abilities: { str: 18, dex: 14, con: 16, int: 11, wis: 12, cha: 15 },
  baseAttackBonus: [4],
  armorClass: {
    total: 19,
    touch: 12,
    flatFooted: 19,
    armorBonus: 6,
    shieldBonus: 0,
    dexBonus: 2,
    naturalArmor: 1,
    deflection: 0,
    misc: 0,
    spellFailureChance: 25,
  },
  savingThrows: {
    fort: 7,
    ref: 3,
    will: 2,
    fortBase: 4,
    refBase: 1,
    willBase: 1,
  },
  skills: [],
  weapons: [
    {
      id: "weap-earth-breaker",
      name: "Masterwork Earth Breaker",
      type: "melee",
      attackBonus: [9], // BAB 4 + STR 4 + MW 1
      damageDice: "2d6",
      damageBonus: 6, // 1.5x STR 4 = 6
      critRange: 20,
      critMultiplier: 3,
      tags: ["Masterwork", "2-Handed"],
    },
    {
      id: "weap-spiked-gauntlet",
      name: "Spiked Gauntlet",
      type: "melee",
      attackBonus: [8],
      damageDice: "1d4",
      damageBonus: 4,
      critRange: 20,
      critMultiplier: 2,
      tags: ["Light"],
    },
    {
      id: "weap-rat-bite",
      name: "Bite (Ring of Rat Fangs)",
      type: "melee",
      attackBonus: [8], // primary alone, or secondary at -5 in full attack
      damageDice: "1d4",
      damageBonus: 4,
      critRange: 20,
      critMultiplier: 2,
      tags: ["Natural Attack", "In Rage Only"],
    },
  ],
  buffs: [
    {
      id: "bloodrage",
      name: "Bloodrage",
      description: "+4 STR, +4 CON, +2 Fort, +2 Will, -2 AC, +5 ft reach",
      active: false,
      attackMod: 2,
      damageMod: 3,
      acMod: -2,
      abilityMods: { str: 4, con: 4 },
      color: "error",
    },
    {
      id: "power-attack",
      name: "Power Attack",
      description: "-2 attack, +6 damage (2H)",
      active: false,
      attackMod: -2,
      damageMod: 6,
      acMod: 0,
      meleeOnly: true,
      color: "primary",
    },
  ],
  dailyResources: [
    { id: "bloodrage-rounds", name: "Bloodrage Rounds", total: 14, label: "Rage" },
    { id: "staggering-strike", name: "Staggering Strike (on crit)", total: 5, label: "Stagger" },
  ],
  feats: [
    { id: "f1", index: 0, name: "Power Attack", shortDesc: "Trade attack for damage", fullDesc: "" },
    { id: "f2", index: 1, name: "Furious Focus", shortDesc: "Ignore PA penalty on 1st attack with 2H", fullDesc: "" },
  ],
  classAbilities: [],
  spellSlots: [],
  spells: [],
  inventory: [],
}

export const mazikeenChar: FullCharacter = {
  id: "mazikeen-noctis",
  name: "Mazikeen Noctis",
  class: "Witch",
  level: 4,
  race: "Tiefling",
  alignment: "Lawful Evil",
  maxHp: 38,
  initiativeBonus: 6,
  speed: 30,
  abilities: { str: 10, dex: 19, con: 16, int: 20, wis: 16, cha: 11 },
  baseAttackBonus: [2],
  armorClass: {
    total: 15,
    touch: 14,
    flatFooted: 11,
    armorBonus: 1,
    shieldBonus: 0,
    dexBonus: 4,
    naturalArmor: 0,
    deflection: 0,
    misc: 0,
    spellFailureChance: 0,
  },
  savingThrows: {
    fort: 4,
    ref: 5,
    will: 7,
    fortBase: 1,
    refBase: 1,
    willBase: 4,
  },
  skills: [],
  weapons: [
    {
      id: "weap-light-crossbow",
      name: "Light Crossbow",
      type: "ranged",
      attackBonus: [6],
      damageDice: "1d8",
      damageBonus: 0,
      critRange: 19,
      critMultiplier: 2,
      tags: ["Ranged"],
    },
    {
      id: "weap-dagger-mazikeen",
      name: "Maze's Dagger",
      type: "melee",
      attackBonus: [6],
      damageDice: "1d4",
      damageBonus: 0,
      critRange: 19,
      critMultiplier: 2,
      tags: ["Finesse", "Light"],
    },
  ],
  buffs: [],
  dailyResources: [
    { id: "darkness-sla", name: "Darkness (SLA)", total: 1, label: "Darkness" },
  ],
  feats: [
    { id: "f1", index: 0, name: "Extra Hex", shortDesc: "Gain additional hex", fullDesc: "" },
    { id: "f2", index: 1, name: "Split Hex", shortDesc: "Target two creatures with hex", fullDesc: "" },
  ],
  classAbilities: [
    { id: "ca-evil-eye", name: "Evil Eye", description: "Inflict -2 penalty to AC, attacks, saves, ability, or skills" },
    { id: "ca-misfortune", name: "Misfortune", description: "Target rolls twice and takes worse result" },
    { id: "ca-slumber", name: "Slumber", description: "Target falls into magical sleep" },
    { id: "ca-fortune", name: "Fortune", description: "Target rerolls one d20 per round" },
    { id: "ca-cackle", name: "Cackle", description: "Move action to extend active hexes by 1 round" },
  ],
  spellSlots: [],
  spells: [],
  inventory: [],
}

export const monkChar: FullCharacter = {
  id: "agelmund",
  name: "Agelmund",
  class: "Monk",
  level: 4,
  race: "Human",
  alignment: "Lawful Evil",
  maxHp: 36,
  initiativeBonus: 2,
  speed: 40,
  abilities: { str: 20, dex: 14, con: 14, int: 8, wis: 14, cha: 12 },
  baseAttackBonus: [4],
  armorClass: {
    total: 16,
    touch: 16,
    flatFooted: 13,
    armorBonus: 0,
    shieldBonus: 0,
    dexBonus: 2,
    naturalArmor: 0,
    deflection: 0,
    misc: 4, // WIS 2 + Monk AC 1 + Dodge 1
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
      id: "weap-unarmed",
      name: "Unarmed Strike (Flurry: +9/+9)",
      type: "melee",
      attackBonus: [9, 9], // BAB 4 + STR 5 = +9/+9
      damageDice: "1d8",
      damageBonus: 5,
      critRange: 20,
      critMultiplier: 2,
      tags: ["Unarmed", "Monk", "Full-Round"],
    },
    {
      id: "weap-knuckle-axe",
      name: "Masterwork Knuckle Axe",
      type: "melee",
      attackBonus: [10],
      damageDice: "1d6",
      damageBonus: 5,
      critRange: 20,
      critMultiplier: 3,
      tags: ["Monk", "Slashing"],
    },
  ],
  buffs: [
    {
      id: "ki-defense",
      name: "Ki Defense",
      description: "+4 dodge bonus to AC/CMD for 1 round",
      active: false,
      attackMod: 0,
      damageMod: 0,
      acMod: 4,
      color: "secondary",
    },
  ],
  dailyResources: [
    { id: "ki-pool", name: "Ki Pool", total: 6, label: "Ki" },
    { id: "stunning-fist", name: "Stunning Fist", total: 4, label: "Stun" },
  ],
  feats: [
    { id: "f1", index: 0, name: "Dodge", shortDesc: "+1 dodge AC", fullDesc: "" },
    { id: "f2", index: 1, name: "Jabbing Style", shortDesc: "+1d6 extra damage on repeat hit", fullDesc: "" },
  ],
  classAbilities: [],
  spellSlots: [],
  spells: [],
  inventory: [],
}

export const rogueChar: FullCharacter = {
  id: "mariano-cardamomo",
  name: "Mariano Cardamomo",
  class: "Rogue",
  level: 5,
  race: "Halfling",
  alignment: "Chaotic Evil",
  maxHp: 47,
  initiativeBonus: 7,
  speed: 20,
  abilities: { str: 6, dex: 20, con: 16, int: 18, wis: 14, cha: 17 },
  baseAttackBonus: [3],
  armorClass: {
    total: 20,
    touch: 16,
    flatFooted: 20, // Uncanny Dodge retains DEX to Flat-Footed!
    armorBonus: 4,
    shieldBonus: 0,
    dexBonus: 5,
    naturalArmor: 0,
    deflection: 0,
    misc: 1, // Halfling size bonus
    spellFailureChance: 15,
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
      id: "weap-gold-dagger",
      name: "Gold Plated Dagger (Small)",
      type: "melee",
      attackBonus: [10], // BAB 3 + DEX 5 + Size 1 + Focus 1
      damageDice: "1d3",
      damageBonus: 5, // Finesse Training Dex to damage!
      critRange: 19,
      critMultiplier: 2,
      tags: ["Finesse", "Light", "Dagger"],
    },
    {
      id: "weap-thrown-dagger",
      name: "Dagger (Thrown, Small)",
      type: "ranged",
      attackBonus: [10],
      damageDice: "1d3",
      damageBonus: -2, // Thrown without finesse training uses STR mod -2
      critRange: 19,
      critMultiplier: 2,
      tags: ["Ranged", "Dagger"],
    },
  ],
  buffs: [
    {
      id: "sneak-attack",
      name: "Sneak Attack",
      description: "Extra +3d6 precision damage",
      active: false,
      attackMod: 0,
      damageMod: 0,
      extraDamageDice: "3d6",
      acMod: 0,
      color: "primary",
    },
  ],
  dailyResources: [
    { id: "underhanded", name: "Underhanded (max sneak dmg surprise)", total: 3, label: "Underhanded" },
  ],
  feats: [
    { id: "f1", index: 0, name: "Weapon Finesse", shortDesc: "Dex to attack", fullDesc: "" },
    { id: "f2", index: 1, name: "Weapon Focus (Dagger)", shortDesc: "+1 attack with dagger", fullDesc: "" },
  ],
  classAbilities: [],
  spellSlots: [],
  spells: [],
  inventory: [],
}

// ---------------------------------------------------------------------------
// 3. Authoritative Mathematical Reference Models (Pure PF1e Rules Oracles)
// ---------------------------------------------------------------------------

/** Hex DC = 10 + floor(level/2) + INT modifier */
export function calcHexDc(level: number, intMod: number): number {
  return 10 + Math.floor(level / 2) + intMod
}

/** Bloodrage CON shift: +4 CON = +2 CON mod = +2 HP/level */
export function calcBloodrageHpShift(level: number, conScoreBonus = 4): number {
  const modBonus = Math.floor(conScoreBonus / 2)
  return modBonus * level
}

/** Check if exiting rage will drop current HP to 0 or below, or <= -CON (instant death) */
export function evaluateLethalRageExit(currentHp: number, conScore: number, level = 4): {
  isLethal: boolean
  isInstantDeath: boolean
  resultingHp: number
} {
  const hpLoss = calcBloodrageHpShift(level, 4)
  const resultingHp = currentHp - hpLoss
  const isInstantDeath = resultingHp <= -conScore
  const isLethal = resultingHp <= 0
  return { isLethal, isInstantDeath, resultingHp }
}

/** Fatigue duration on exiting rage = 2 * rounds raged */
export function calcFatigueRounds(roundsRaged: number): number {
  return roundsRaged * 2
}

/** Spellstrike critical doubling: weapon x2 + spell x2 */
export function calcSpellstrikeDamage(params: {
  weaponDamage: number
  spellDamage: number
  isCritical: boolean
  weaponCritMultiplier?: number
  spellCritMultiplier?: number
}): { weaponPart: number; spellPart: number; total: number } {
  const wMult = params.isCritical ? (params.weaponCritMultiplier ?? 2) : 1
  const sMult = params.isCritical ? (params.spellCritMultiplier ?? 2) : 1
  const weaponPart = params.weaponDamage * wMult
  const spellPart = params.spellDamage * sMult
  return { weaponPart, spellPart, total: weaponPart + spellPart }
}

/** Spell Combat attack penalty (-2) and Defensive Casting Sacrifice (0..4) */
export function calcSpellCombatRolls(params: {
  baseBab: number[]
  sacrificePenalty: number
  casterLevel: number
  castingMod: number
  hasCombatCasting?: boolean
}): { weaponAttacks: number[]; concentrationBonus: number } {
  const totalAttackPenalty = -2 - params.sacrificePenalty
  const weaponAttacks = params.baseBab.map(b => b + totalAttackPenalty)
  const combatCastingBonus = params.hasCombatCasting ? 4 : 0
  const concentrationBonus = params.casterLevel + params.castingMod + combatCastingBonus + params.sacrificePenalty
  return { weaponAttacks, concentrationBonus }
}

/** Wild Shape armor melding: melds non-wild armor/shield -> zeroing armorBonus, shieldBonus, ASF */
export function simulateWildShapeArmorMelding(baseAc: ArmorClass): ArmorClass {
  return {
    ...baseAc,
    armorBonus: 0,
    shieldBonus: 0,
    spellFailureChance: 0,
  }
}

/** Effective AC Calculation separating bonus types:
 * - Natural Armor: applies to Total and Flat-Footed, NOT Touch
 * - Dodge Bonus: applies to Total, Touch, and CMD, NOT Flat-Footed (unless Uncanny Dodge)
 * - Size Bonus: applies to Total, Touch, Flat-Footed
 */
export function simulateEffectiveAc(params: {
  baseAc: ArmorClass
  naturalArmorBonuses: number[]
  dodgeBonuses: number[]
  sizeBonus: number
  deflectionBonus?: number
  hasUncannyDodge?: boolean
}): { total: number; touch: number; flatFooted: number } {
  const base = params.baseAc
  const natSum = params.naturalArmorBonuses.reduce((a, b) => a + b, 0)
  const dodgeSum = params.dodgeBonuses.reduce((a, b) => a + b, 0)
  const size = params.sizeBonus
  const defl = params.deflectionBonus ?? 0

  // Touch AC: 10 + DEX + Dodge + Size + Deflection (NO armor, NO shield, NO natural armor)
  const touch = 10 + base.dexBonus + dodgeSum + size + defl + (base.misc ?? 0)

  // Flat-Footed AC: Total minus DEX and minus Dodge (retains DEX and Dodge if Uncanny Dodge)
  const dexAndDodgeToFf = params.hasUncannyDodge ? (base.dexBonus + dodgeSum) : 0
  const flatFooted = 10 + base.armorBonus + base.shieldBonus + base.naturalArmor + natSum + size + defl + (base.misc ?? 0) + dexAndDodgeToFf

  // Total AC: 10 + Armor + Shield + DEX + Natural + Dodge + Size + Deflection + Misc
  const total = 10 + base.armorBonus + base.shieldBonus + base.dexBonus + base.naturalArmor + natSum + dodgeSum + size + defl + (base.misc ?? 0)

  return { total, touch, flatFooted }
}

/** Furious Focus: 1st attack ignores Power Attack penalty on two-handed weapons */
export function calcFuriousFocusAttack(
  attackIndex: number,
  baseAttack: number,
  isTwoHanded: boolean,
  hasPowerAttack: boolean,
  hasFuriousFocus: boolean
): number {
  if (!hasPowerAttack) return baseAttack
  const paPenalty = -2
  if (isTwoHanded && hasFuriousFocus && attackIndex === 0) {
    // First attack ignores penalty!
    return baseAttack
  }
  return baseAttack + paPenalty
}

/** Underhanded strike: maximizes sneak attack damage (3d6 -> 18) */
export function calcUnderhandedDamage(sneakDiceCount = 3): number {
  return sneakDiceCount * 6
}

/** Halfling dagger critical confirmation bonus (+3) */
export function calcHalflingCritConfirm(
  baseAttackBonus: number,
  d20Roll: number,
  isDagger: boolean,
  isHalfling: boolean
): number {
  const bonus = (isDagger && isHalfling) ? 3 : 0
  return d20Roll + baseAttackBonus + bonus
}

/** Natural Spell casting validation in animal form */
export function validateNaturalSpellCasting(
  isWildShapeActive: boolean,
  hasNaturalSpellFeat: boolean,
  spellComponents: string
): { canCast: boolean; hasWarning: boolean; warning?: string } {
  if (!isWildShapeActive) return { canCast: true, hasWarning: false }
  if (hasNaturalSpellFeat) return { canCast: true, hasWarning: false }
  
  const hasVerbalOrSomatic = /v|s/i.test(spellComponents)
  if (hasVerbalOrSomatic) {
    return {
      canCast: false,
      hasWarning: true,
      warning: "Cannot cast spells with Verbal or Somatic components while in Wild Shape without Natural Spell feat.",
    }
  }
  return { canCast: true, hasWarning: false }
}

// ---------------------------------------------------------------------------
// 4. Pure Reference Turn Advancement Simulation
// ---------------------------------------------------------------------------
export interface SimulatedClassMechanics {
  // Bloodrager
  isRaging?: boolean
  roundsRaged?: number
  fatigueCountdown?: number
  furiousFocusUsed?: boolean
  // Witch
  activeHexes?: Array<{
    id: string
    type: "evil-eye" | "misfortune" | "slumber" | "fortune"
    remainingRounds: number
    cackleExtendable: boolean
  }>
  cackleUsedThisRound?: boolean
  // Monk
  kiDefenseRounds?: number
  kiSpeedRounds?: number
  kiExtraAttackActive?: boolean
  stunningFistDeclared?: string | null
  // Magus
  arcanePoolWeaponRounds?: number
  // Rogue
  debilitatingInjury?: {
    mode: "bewildered" | "disoriented" | "hampered"
    remainingRounds: number
  } | null
}

export function advanceSimulatedTurn(state: SimulatedClassMechanics): {
  nextState: SimulatedClassMechanics
  clearedConditions: string[]
  events: string[]
} {
  const next = { ...state }
  const clearedConditions: string[] = []
  const events: string[] = []

  // 1. Bloodrager
  if (next.isRaging) {
    next.roundsRaged = (next.roundsRaged ?? 0) + 1
    events.push("Bloodrage round consumed")
  } else if (next.fatigueCountdown && next.fatigueCountdown > 0) {
    next.fatigueCountdown -= 1
    events.push(`Fatigue countdown: ${next.fatigueCountdown}`)
    if (next.fatigueCountdown === 0) {
      clearedConditions.push("fatigued")
      events.push("Fatigue expired and condition removed")
    }
  }
  next.furiousFocusUsed = false

  // 2. Witch
  if (next.activeHexes) {
    next.activeHexes = next.activeHexes
      .map(h => ({ ...h, remainingRounds: h.remainingRounds - 1 }))
      .filter(h => h.remainingRounds > 0)
  }
  next.cackleUsedThisRound = false

  // 3. Monk
  if (next.kiDefenseRounds && next.kiDefenseRounds > 0) {
    next.kiDefenseRounds = Math.max(0, next.kiDefenseRounds - 1)
  }
  if (next.kiSpeedRounds && next.kiSpeedRounds > 0) {
    next.kiSpeedRounds = Math.max(0, next.kiSpeedRounds - 1)
  }
  next.kiExtraAttackActive = false
  next.stunningFistDeclared = null

  // 4. Magus
  if (next.arcanePoolWeaponRounds && next.arcanePoolWeaponRounds > 0) {
    next.arcanePoolWeaponRounds = Math.max(0, next.arcanePoolWeaponRounds - 1)
  }

  // 5. Rogue
  if (next.debilitatingInjury) {
    const r = next.debilitatingInjury.remainingRounds - 1
    if (r <= 0) {
      next.debilitatingInjury = null
      events.push("Debilitating injury expired")
    } else {
      next.debilitatingInjury = { ...next.debilitatingInjury, remainingRounds: r }
    }
  }

  return { nextState: next, clearedConditions, events }
}

// ---------------------------------------------------------------------------
// 5. Store Reset and Character Setup Utilities
// ---------------------------------------------------------------------------
export function resetTestStores() {
  useCharacterStore.setState({
    characters: [noorieChar, shotrixChar, knamChar, mazikeenChar, monkChar, rogueChar],
    activeCharacterId: "shotrix-blackburn",
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

export function setupPartySession(charId: string, overrides?: Partial<SessionState>): SessionState {
  const currentSessions = useSessionStore.getState().sessions
  const allChars = [noorieChar, shotrixChar, knamChar, mazikeenChar, monkChar, rogueChar]
  const targetChar = allChars.find(c => c.id === charId) ?? shotrixChar

  const baseSession: SessionState = {
    characterId: charId,
    currentHp: targetChar.maxHp,
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

export const agelmundChar = monkChar;
export const marianoChar = rogueChar;
