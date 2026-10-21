import type { FullCharacter } from '../store/useCharacterStore'
import type { Spell } from '../types/resources'
import { abilityMod } from './dice-engine'
import { calcConcentrationBonus, calcSpellDc, getCastingAbilityKey } from './stat-calc'

export function spellAttackBonus(character: FullCharacter, spell: Spell): number {
  if (!spell.attackType) return 0
  const bab = character.baseAttackBonus[0] ?? 0
  const mod =
    spell.attackType === 'meleeTouch'
      ? abilityMod(character.abilities.str)
      : abilityMod(character.abilities.dex)
  return bab + mod
}

export function spellSaveDc(character: FullCharacter, spell: Spell): number {
  const key = getCastingAbilityKey(character.class)
  return calcSpellDc(spell.level, abilityMod(character.abilities[key]))
}

export function concentrationBonus(character: FullCharacter, defensive = false): number {
  const key = getCastingAbilityKey(character.class)
  const hasCombatCasting = character.feats.some((feat) => /combat casting/i.test(feat.name))
  return calcConcentrationBonus(
    character.level,
    abilityMod(character.abilities[key]),
    defensive && hasCombatCasting ? 4 : 0
  )
}
