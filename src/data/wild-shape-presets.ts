/**
 * src/data/wild-shape-presets.ts
 * Beast Shape I catalogue (Pathfinder 1e, Druid Wild Shape at level 4).
 *
 * Medium forms: +2 size bonus to Strength, +2 natural armor.
 * Small forms:  +2 size bonus to Dexterity, +1 natural armor, +1 size to attack/AC,
 *               -1 to CMB/CMD (size), +4 size bonus to Stealth.
 *
 * Natural attack multipliers follow the Bestiary rules: a sole natural attack adds
 * 1.5x Str, primary attacks add 1x Str, secondary attacks are made at -5 and add 0.5x Str.
 */

import type { WildShapePreset } from '../types/class-mechanics'

export type WildShapeFormId =
  | 'wolf'
  | 'leopard'
  | 'black-bear'
  | 'deinonychus'
  | 'crocodile'
  | 'eagle'
  | 'octopus'

export const WILD_SHAPE_PRESETS: Record<WildShapeFormId, WildShapePreset> = {
  wolf: {
    id: 'wolf',
    name: 'Wolf',
    size: 'Medium',
    strBonus: 2,
    dexBonus: 0,
    naturalArmorBonus: 2,
    sizeAcBonus: 0,
    sizeAtkBonus: 0,
    sizeCmbCmdMod: 0,
    stealthBonus: 0,
    speed: 50,
    senses: ['Low-light vision', 'Scent'],
    naturalAttacks: [
      { name: 'Bite', isPrimary: true, damageDice: '1d6', attackCount: 1, strMultiplier: 1.5, attackBonusMod: 0, trip: true },
    ],
    specialAbilities: ['Trip'],
  },
  leopard: {
    id: 'leopard',
    name: 'Leopard',
    size: 'Medium',
    strBonus: 2,
    dexBonus: 0,
    naturalArmorBonus: 2,
    sizeAcBonus: 0,
    sizeAtkBonus: 0,
    sizeCmbCmdMod: 0,
    stealthBonus: 0,
    speed: 30,
    specialSpeeds: { climb: 20 },
    senses: ['Low-light vision', 'Scent'],
    naturalAttacks: [
      { name: 'Bite', isPrimary: true, damageDice: '1d6', attackCount: 1, strMultiplier: 1, attackBonusMod: 0 },
      { name: 'Claw', isPrimary: true, damageDice: '1d3', attackCount: 2, strMultiplier: 1, attackBonusMod: 0 },
    ],
    specialAbilities: ['Pounce'],
  },
  'black-bear': {
    id: 'black-bear',
    name: 'Black Bear',
    size: 'Medium',
    strBonus: 2,
    dexBonus: 0,
    naturalArmorBonus: 2,
    sizeAcBonus: 0,
    sizeAtkBonus: 0,
    sizeCmbCmdMod: 0,
    stealthBonus: 0,
    speed: 40,
    senses: ['Low-light vision', 'Scent'],
    naturalAttacks: [
      { name: 'Bite', isPrimary: true, damageDice: '1d6', attackCount: 1, strMultiplier: 1, attackBonusMod: 0 },
      { name: 'Claw', isPrimary: true, damageDice: '1d4', attackCount: 2, strMultiplier: 1, attackBonusMod: 0 },
    ],
  },
  deinonychus: {
    id: 'deinonychus',
    name: 'Deinonychus',
    size: 'Medium',
    strBonus: 2,
    dexBonus: 0,
    naturalArmorBonus: 2,
    sizeAcBonus: 0,
    sizeAtkBonus: 0,
    sizeCmbCmdMod: 0,
    stealthBonus: 0,
    speed: 60,
    senses: ['Low-light vision', 'Scent'],
    naturalAttacks: [
      { name: 'Talon', isPrimary: true, damageDice: '1d6', attackCount: 2, strMultiplier: 1, attackBonusMod: 0 },
      { name: 'Bite', isPrimary: true, damageDice: '1d4', attackCount: 1, strMultiplier: 1, attackBonusMod: 0 },
      { name: 'Foreclaw', isPrimary: false, damageDice: '1d4', attackCount: 2, strMultiplier: 0.5, attackBonusMod: -5 },
    ],
    specialAbilities: ['Pounce'],
  },
  crocodile: {
    id: 'crocodile',
    name: 'Crocodile',
    size: 'Medium',
    strBonus: 2,
    dexBonus: 0,
    naturalArmorBonus: 2,
    sizeAcBonus: 0,
    sizeAtkBonus: 0,
    sizeCmbCmdMod: 0,
    stealthBonus: 0,
    speed: 20,
    specialSpeeds: { swim: 30 },
    senses: ['Low-light vision'],
    naturalAttacks: [
      { name: 'Bite', isPrimary: true, damageDice: '1d8', attackCount: 1, strMultiplier: 1, attackBonusMod: 0, grab: true },
      { name: 'Tail Slap', isPrimary: false, damageDice: '1d12', attackCount: 1, strMultiplier: 0.5, attackBonusMod: -5 },
    ],
    specialAbilities: ['Grab', 'Hold Breath'],
  },
  eagle: {
    id: 'eagle',
    name: 'Eagle',
    size: 'Small',
    strBonus: 0,
    dexBonus: 2,
    naturalArmorBonus: 1,
    sizeAcBonus: 1,
    sizeAtkBonus: 1,
    sizeCmbCmdMod: -1,
    stealthBonus: 4,
    speed: 10,
    specialSpeeds: { fly: { speed: 80, maneuverability: 'average' } },
    senses: ['Low-light vision'],
    naturalAttacks: [
      { name: 'Talon', isPrimary: true, damageDice: '1d4', attackCount: 2, strMultiplier: 1, attackBonusMod: 0 },
      { name: 'Bite', isPrimary: true, damageDice: '1d4', attackCount: 1, strMultiplier: 1, attackBonusMod: 0 },
    ],
  },
  octopus: {
    id: 'octopus',
    name: 'Octopus',
    size: 'Small',
    strBonus: 0,
    dexBonus: 2,
    naturalArmorBonus: 1,
    sizeAcBonus: 1,
    sizeAtkBonus: 1,
    sizeCmbCmdMod: -1,
    stealthBonus: 4,
    speed: 20,
    specialSpeeds: { swim: 30, jet: 200 },
    senses: ['Low-light vision'],
    naturalAttacks: [
      { name: 'Bite', isPrimary: true, damageDice: '1d3', attackCount: 1, strMultiplier: 1, attackBonusMod: 0 },
      { name: 'Tentacles', isPrimary: false, damageDice: '1d4', attackCount: 1, strMultiplier: 0.5, attackBonusMod: -5, grab: true },
    ],
    specialAbilities: ['Ink Cloud', 'Jet', 'Grab'],
  },
}

export const WILD_SHAPE_PRESET_LIST: WildShapePreset[] = Object.values(WILD_SHAPE_PRESETS)

export function getWildShapePreset(id: string | null | undefined): WildShapePreset | null {
  if (!id) return null
  return (WILD_SHAPE_PRESETS as Record<string, WildShapePreset>)[id] ?? null
}
