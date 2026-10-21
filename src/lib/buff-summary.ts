import type { BuffToggle } from '../types/combat'

const signed = (value: number) => (value > 0 ? `+${value}` : `${value}`)

/**
 * Compact, human-readable summary of every modifier carried by a buff.
 * Example: "+2 ATK | -2 AC | +1 FORT".
 */
export function summarizeBuffModifiers(buff: BuffToggle): string {
  const parts: string[] = []

  if (buff.attackMod !== 0) parts.push(`${signed(buff.attackMod)} ATK`)
  if (buff.damageMod !== 0) parts.push(`${signed(buff.damageMod)} DMG`)
  if (buff.acMod !== 0) parts.push(`${signed(buff.acMod)} AC`)

  if (typeof buff.saveMod === 'number') {
    if (buff.saveMod !== 0) parts.push(`${signed(buff.saveMod)} SAVES`)
  } else if (buff.saveMod) {
    if (buff.saveMod.fort) parts.push(`${signed(buff.saveMod.fort)} FORT`)
    if (buff.saveMod.ref) parts.push(`${signed(buff.saveMod.ref)} REF`)
    if (buff.saveMod.will) parts.push(`${signed(buff.saveMod.will)} WILL`)
  }

  if (buff.abilityMods) {
    for (const [key, value] of Object.entries(buff.abilityMods)) {
      if (value) parts.push(`${signed(value)} ${key.toUpperCase()}`)
    }
  }

  if (buff.extraDamageDice) parts.push(`+${buff.extraDamageDice} DMG`)

  return parts.join(' | ')
}

export function buffModifierTokens(buff: BuffToggle): { label: string; value: number | null }[] {
  const tokens: { label: string; value: number | null }[] = []
  if (buff.attackMod !== 0) tokens.push({ label: 'ATK', value: buff.attackMod })
  if (buff.damageMod !== 0) tokens.push({ label: 'DMG', value: buff.damageMod })
  if (buff.acMod !== 0) tokens.push({ label: 'AC', value: buff.acMod })

  if (typeof buff.saveMod === 'number') {
    if (buff.saveMod !== 0) tokens.push({ label: 'SAVES', value: buff.saveMod })
  } else if (buff.saveMod) {
    if (buff.saveMod.fort) tokens.push({ label: 'FORT', value: buff.saveMod.fort })
    if (buff.saveMod.ref) tokens.push({ label: 'REF', value: buff.saveMod.ref })
    if (buff.saveMod.will) tokens.push({ label: 'WILL', value: buff.saveMod.will })
  }

  if (buff.abilityMods) {
    for (const [key, value] of Object.entries(buff.abilityMods)) {
      if (value) tokens.push({ label: key.toUpperCase(), value })
    }
  }

  if (buff.extraDamageDice) tokens.push({ label: buff.extraDamageDice, value: null })
  return tokens
}

export const POSITIVE_COLOR = '#00daf3'
export const NEGATIVE_COLOR = '#ffb4ab'

export function modifierColor(value: number | null): string {
  if (value === null || value === 0) return 'text-on-surface'
  return value > 0 ? 'text-[#00daf3]' : 'text-[#ffb4ab]'
}
