import type { DiceRoll, RollResult, DiceType } from '../types/dice'

function secureRandom(max: number): number {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return (array[0] % max) + 1
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

  // Critical threat: highest die roll (first die for attack rolls) within crit range
  const firstRoll = naturalRolls[0] ?? 0
  const isCriticalThreat = firstRoll >= critRange

  const naturalsStr = naturalRolls.length === 1
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
  }
}

export function parseDiceFormula(formula: string): { count: number; sides: DiceType; bonus: number } {
  // e.g. "2d6", "1d8+3", "d20+5"
  const match = formula.match(/^(\d*)d(\d+)([+-]\d+)?$/)
  if (!match) return { count: 1, sides: 20, bonus: 0 }
  const count = match[1] ? parseInt(match[1]) : 1
  const sides = parseInt(match[2]) as DiceType
  const bonus = match[3] ? parseInt(match[3]) : 0
  return { count, sides, bonus }
}

export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}
