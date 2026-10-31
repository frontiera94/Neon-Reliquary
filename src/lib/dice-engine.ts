import type { DiceRoll, RollResult, DiceType } from '../types/dice'

const UINT32_RANGE = 0x1_0000_0000

/**
 * Uniform integer in [1, max] from the CSPRNG.
 * Uses rejection sampling: a plain `x % max` over a 2^32 range is biased toward
 * low faces whenever 2^32 is not a multiple of `max` (e.g. d6, d10, d12, d20, d100).
 */
function secureRandom(max: number): number {
  if (!Number.isInteger(max) || max < 1 || max > UINT32_RANGE) {
    throw new RangeError(`Invalid die size: ${max}`)
  }
  const limit = UINT32_RANGE - (UINT32_RANGE % max)
  const array = new Uint32Array(1)
  let value: number
  do {
    crypto.getRandomValues(array)
    value = array[0]
  } while (value >= limit)
  return (value % max) + 1
}

/** Rolls a single unbiased die with the given number of faces. */
export function rollDie(sides: number): number {
  return secureRandom(sides)
}

function rollOneDie(sides: DiceType): number {
  return secureRandom(sides)
}

export function rollDice(roll: DiceRoll): RollResult {
  const { diceType, count, modifier, label, critRange = 20 } = roll

  const naturalRolls: number[] = []
  for (let i = 0; i < count; i++) {
    naturalRolls.push(rollOneDie(diceType))
  }

  const sumNatural = naturalRolls.reduce((a, b) => a + b, 0)
  const total = sumNatural + modifier

  // Critical threat: highest die roll (first die for attack rolls) within crit range; natural 1 never threatens
  const firstRoll = naturalRolls[0] ?? 0
  const isCriticalThreat = firstRoll > 1 && firstRoll >= critRange

  const naturalsStr =
    naturalRolls.length === 0
      ? '0'
      : naturalRolls.length === 1
      ? `${naturalRolls[0]}`
      : `(${naturalRolls.join('+')})=${sumNatural}`

  const modStr =
    modifier > 0 ? ` + ${modifier}` : modifier < 0 ? ` - ${Math.abs(modifier)}` : ''

  const formula =
    count === 1
      ? `d${diceType}: ${naturalsStr}${modStr} = ${total}`
      : `${count}d${diceType}: ${naturalsStr}${modStr} = ${total}`

  return {
    id: crypto.randomUUID(),
    label,
    diceType,
    naturalRolls,
    modifier,
    total,
    isCriticalThreat,
    isCriticalConfirmed: false,
    formula,
    timestamp: Date.now(),
    breakdown: roll.breakdown,
  }
}

const FALLBACK_FORMULA = { count: 1, sides: 20 as DiceType, bonus: 0 }

/**
 * Parses a single-term dice formula such as "2d6", "1d8+3", "1d8 + 2" or "d20+5".
 * Malformed input (including multi-term formulas like "1d6+1d4", zero-count, and
 * zero-sided dice) falls back to a plain d20.
 */
export function parseDiceFormula(formula: string): { count: number; sides: DiceType; bonus: number } {
  const clean = formula.trim().replace(/\s+/g, '')
  const match = clean.match(/^(\d*)d(\d+)([+-]\d+)?$/i)
  if (!match) return { ...FALLBACK_FORMULA }
  const count = match[1] ? parseInt(match[1], 10) : 1
  const sides = parseInt(match[2], 10)
  if (count < 1 || sides < 1 || sides > UINT32_RANGE) return { ...FALLBACK_FORMULA }
  const bonus = match[3] ? parseInt(match[3], 10) : 0
  return { count, sides: sides as DiceType, bonus }
}

export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}
