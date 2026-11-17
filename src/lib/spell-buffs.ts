import type { Spell } from "../types/resources"
import type { BuffToggle } from "../types/combat"
import { deriveBuffFromSpell } from "./stat-calc"

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
    NON_INSTANT.test(spell.duration) &&
    /abjuration|transmutation|enchantment/i.test(spell.school) &&
    !/instantaneous|permanent/i.test(spell.duration)
  )
}

/**
 * Converts a prepared duration spell into a BuffToggle understood by
 * calcEffectiveAbilities / calcEffectiveArmorClass / calcEffectiveSaves.
 * Delegates modifier derivation to deriveBuffFromSpell so all UI surfaces share
 * one source of truth.
 */
export function spellToBuff(spell: Spell): BuffToggle {
  return {
    ...deriveBuffFromSpell(spell),
    color: "primary",
  }
}
