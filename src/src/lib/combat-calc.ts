import type { Weapon, BuffToggle } from '../types/combat'

export interface EffectiveWeaponStats {
  attackBonus: number[]
  damageBonus: number
  acMod: number
  activeBuffNames: string[]
}

export function calcEffectiveWeapon(
  weapon: Weapon,
  buffs: BuffToggle[],
  activeBuffIds: string[]
): EffectiveWeaponStats {
  const activeBuffs = buffs.filter((b) => activeBuffIds.includes(b.id))
  const applicableBuffs = weapon.type === 'ranged'
    ? activeBuffs.filter((b) => !b.meleeOnly)
    : activeBuffs

  const totalAttackMod = applicableBuffs.reduce((sum, b) => sum + b.attackMod, 0)
  const totalDamageMod = applicableBuffs.reduce((sum, b) => sum + b.damageMod, 0)
  const totalAcMod = activeBuffs.reduce((sum, b) => sum + b.acMod, 0)

  return {
    attackBonus: weapon.attackBonus.map((a) => a + totalAttackMod),
    damageBonus: weapon.damageBonus + totalDamageMod,
    acMod: totalAcMod,
    activeBuffNames: applicableBuffs.map((b) => b.name),
  }
}

export function formatAttackBonus(bonuses: number[]): string {
  return bonuses.map((b) => (b >= 0 ? `+${b}` : `${b}`)).join(' / ')
}

export function formatDamage(dice: string, bonus: number): string {
  if (bonus === 0) return dice
  return bonus > 0 ? `${dice} + ${bonus}` : `${dice} - ${Math.abs(bonus)}`
}
