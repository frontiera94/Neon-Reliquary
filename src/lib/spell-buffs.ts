import type { Spell } from '../types/resources'
import type { BuffToggle } from '../types/combat'

const NON_INSTANT = /minute|hour|round|day|concentration|permanent/i

const KNOWN_BUFF_NAMES = /mage armor|shield$|shield of faith|barkskin|haste|bless|divine favor|heroism|good hope|prayer|resistance$|remove fear|protection from|bull's strength|cat's grace|bear's endurance|eagle's splendor|fox's cunning|owl's wisdom|eagle|enlarge person|reduce person|righteous might|magic weapon|greater magic weapon|resist energy|stoneskin|invisibility|blur|mirror image|see invisibility|fly$|freedom of movement|death ward|magic circle|false life|aid$|heroic|ward|rage/i

const BUFF_EFFECT_RE = /bonus to (ac|armor class|attack|damage|saving throws?|saves?)|grants? (a )?\+|protection from|resistance to|damage reduction|temporary hit points|blocks? magic missiles/i

/**
 * True when a spell can reasonably be represented as a persistent tactical buff.
 * Instantaneous damage/utility spells are excluded.
 */
export function isBuffSpell(spell: Spell): boolean {
  if (spell.damageDice || spell.attackType) {
    return KNOWN_BUFF_NAMES.test(spell.name) && !/instantaneous/i.test(spell.duration)
  }
  if (KNOWN_BUFF_NAMES.test(spell.name)) return true
  if (BUFF_EFFECT_RE.test(spell.description) && NON_INSTANT.test(spell.duration)) return true
  return (
    !NON_INSTANT.test(spell.duration) === false &&
    /abjuration|transmutation|enchantment/i.test(spell.school) &&
    !/instantaneous|permanent/i.test(spell.duration)
  )
}

function scaleBonus(spell: Spell, max = 4): number {
  return Math.max(1, Math.min(max, Math.floor(spell.level / 2) + 1))
}

/**
 * Converts a prepared duration spell into a BuffToggle understood by
 * calcEffectiveAbilities / calcEffectiveArmorClass / calcEffectiveSaves.
 */
export function spellToBuff(spell: Spell): BuffToggle {
  const name = spell.name.toLowerCase()
  const buff: BuffToggle = {
    id: `spell-buff-${spell.id}`,
    name: spell.name,
    active: true,
    attackMod: 0,
    damageMod: 0,
    acMod: 0,
    color: 'primary',
    isCustom: true,
    duration: spell.duration,
    description: spell.description,
  }

  if (/mage armor|shield$|shield of faith/i.test(name)) {
    buff.acMod = /mage armor|shield$/i.test(name) ? 4 : 2
  } else if (/barkskin/i.test(name)) {
    buff.acMod = 2
  } else if (/haste/i.test(name)) {
    buff.attackMod = 1
    buff.acMod = 1
    buff.saveMod = { ref: 1 }
  } else if (/bless|prayer|divine favor|magic weapon|greater magic weapon/i.test(name)) {
    const amount = /divine favor|greater magic weapon|prayer/i.test(name) ? scaleBonus(spell, 3) : 1
    buff.attackMod = amount
    buff.damageMod = /greater magic weapon|prayer/i.test(name) ? amount : 0
  } else if (/heroism|good hope/i.test(name)) {
    buff.attackMod = 2
    buff.damageMod = /good hope/i.test(name) ? 2 : 0
    buff.saveMod = 2
  } else if (/resistance$/i.test(name)) {
    buff.saveMod = 1
  } else if (/remove fear/i.test(name)) {
    buff.saveMod = 4
  } else if (/protection from/i.test(name)) {
    buff.acMod = 2
    buff.saveMod = 2
  } else if (/bull's strength/i.test(name)) {
    buff.abilityMods = { str: 4 }
  } else if (/cat's grace/i.test(name)) {
    buff.abilityMods = { dex: 4 }
  } else if (/bear's endurance/i.test(name)) {
    buff.abilityMods = { con: 4 }
  } else if (/eagle's splendor/i.test(name)) {
    buff.abilityMods = { cha: 4 }
  } else if (/fox's cunning/i.test(name)) {
    buff.abilityMods = { int: 4 }
  } else if (/owl's wisdom/i.test(name)) {
    buff.abilityMods = { wis: 4 }
  } else if (/enlarge person/i.test(name)) {
    buff.abilityMods = { str: 2 }
    buff.acMod = -1
    buff.attackMod = -1
  } else if (/reduce person/i.test(name)) {
    buff.abilityMods = { dex: 2 }
    buff.acMod = 1
  } else if (/righteous might/i.test(name)) {
    buff.abilityMods = { str: 4, con: 2 }
    buff.acMod = 2
  } else if (/resist energy/i.test(name)) {
    buff.saveMod = 0
  }

  return buff
}
