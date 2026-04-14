import type { ConditionType } from '../types/combat'

export interface ConditionInfo {
  name: string
  summary: string
  penalties: string[]
}

export const CONDITION_INFO: Record<ConditionType, ConditionInfo> = {
  shaken: {
    name: 'Shaken',
    summary: 'Fear penalty on most rolls.',
    penalties: [
      '–2 fear penalty on attack rolls',
      '–2 fear penalty on saving throws',
      '–2 fear penalty on skill checks',
      '–2 fear penalty on ability checks',
    ],
  },
  sickened: {
    name: 'Sickened',
    summary: 'Penalty on attacks, saves, and skill checks.',
    penalties: [
      '–2 penalty on attack rolls',
      '–2 penalty on weapon damage rolls',
      '–2 penalty on saving throws',
      '–2 penalty on skill checks',
      '–2 penalty on ability checks',
    ],
  },
  fatigued: {
    name: 'Fatigued',
    summary: "Reduced Str & Dex, can't charge or run.",
    penalties: [
      '–2 penalty to Strength',
      '–2 penalty to Dexterity',
      'Cannot charge or run',
      'Becoming fatigued again causes exhaustion',
    ],
  },
  exhausted: {
    name: 'Exhausted',
    summary: 'Severe Str & Dex penalties, half speed.',
    penalties: [
      '–6 penalty to Strength',
      '–6 penalty to Dexterity',
      'Speed reduced to half normal',
      'Rest for 1 hour reduces to fatigued',
    ],
  },
  blinded: {
    name: 'Blinded',
    summary: 'Cannot see; miss chances and AC penalties.',
    penalties: [
      'Loses Dex bonus to AC',
      '–2 penalty to AC',
      '–4 penalty on Perception checks',
      '50% miss chance on melee attacks',
      'Ranged attacks randomly miss 50% of the time',
      'Cannot make attacks of opportunity',
    ],
  },
  confused: {
    name: 'Confused',
    summary: 'Acts randomly each round.',
    penalties: [
      '01–25: Acts normally',
      '26–50: Babbles incoherently',
      '51–75: Deals 1d8+Str mod damage to self',
      '76–100: Attacks nearest creature',
      'Cannot make attacks of opportunity',
    ],
  },
  dazed: {
    name: 'Dazed',
    summary: "Can't act but retains AC.",
    penalties: [
      'Cannot take actions',
      'Retains Dex bonus to AC',
      'Can still be the target of attacks of opportunity',
    ],
  },
  frightened: {
    name: 'Frightened',
    summary: 'Fear penalty on rolls; must flee.',
    penalties: [
      '–2 fear penalty on attack rolls',
      '–2 fear penalty on saving throws',
      '–2 fear penalty on skill checks',
      '–2 fear penalty on ability checks',
      'Must flee from the source of fear when possible',
    ],
  },
  nauseated: {
    name: 'Nauseated',
    summary: 'Limited to a single move action.',
    penalties: [
      'Can only take a single move action per turn',
      'Cannot attack, cast spells, concentrate, or use most abilities',
    ],
  },
  paralyzed: {
    name: 'Paralyzed',
    summary: 'Helpless; Str and Dex effectively 0.',
    penalties: [
      'Strength and Dexterity score treated as 0',
      'Cannot move or take actions',
      'Flying creature falls; swimming creature may drown',
      'Considered helpless (melee attackers get +4 to hit, coup de grace is possible)',
    ],
  },
  prone: {
    name: 'Prone',
    summary: 'Penalty on melee attacks; bonus AC vs ranged.',
    penalties: [
      '–4 penalty on melee attack rolls',
      '+4 AC bonus against ranged attacks',
      '–4 penalty to AC against melee attacks',
      'Standing up is a move action that provokes AoO',
    ],
  },
  stunned: {
    name: 'Stunned',
    summary: "Drops items, can't act, loses AC bonuses.",
    penalties: [
      'Drops everything held',
      'Cannot take actions',
      '–2 penalty to AC',
      'Loses Dex bonus to AC',
      'Attackers gain +2 to hit',
    ],
  },
}
