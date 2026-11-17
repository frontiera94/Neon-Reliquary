import type { Locale } from '../store/useLocaleStore'
import type { ConditionType } from '../types/combat'
import { CONDITION_INFO, type ConditionInfo } from '../lib/conditions'

const CONDITION_INFO_IT: Record<ConditionType, ConditionInfo> = {
  shaken: {
    name: 'Scosso',
    summary: 'Penalità di paura alla maggior parte dei tiri.',
    penalties: [
      '–2 di paura ai tiri per colpire',
      '–2 di paura ai tiri salvezza',
      '–2 di paura alle prove di abilità',
      '–2 di paura alle prove di caratteristica',
    ],
  },
  sickened: {
    name: 'Infermo',
    summary: 'Penalità ad attacchi, tiri salvezza e prove di abilità.',
    penalties: [
      '–2 ai tiri per colpire',
      '–2 ai tiri per i danni delle armi',
      '–2 ai tiri salvezza',
      '–2 alle prove di abilità',
      '–2 alle prove di caratteristica',
    ],
  },
  fatigued: {
    name: 'Affaticato',
    summary: 'For e Des ridotte, non può caricare o correre.',
    penalties: [
      '–2 alla Forza',
      '–2 alla Destrezza',
      'Non può caricare né correre',
      'Diventare nuovamente affaticato rende esausto',
    ],
  },
  exhausted: {
    name: 'Esausto',
    summary: 'Gravi penalità a For e Des, velocità dimezzata.',
    penalties: [
      '–6 alla Forza',
      '–6 alla Destrezza',
      'Velocità ridotta alla metà',
      'Riposare per 1 ora riduce a affaticato',
    ],
  },
  blinded: {
    name: 'Accecato',
    summary: 'Non può vedere; probabilità di mancare e penalità alla CA.',
    penalties: [
      'Perde il bonus di Destrezza alla CA',
      '–2 alla CA',
      '–4 alle prove di Percezione',
      '50% di mancare negli attacchi in mischia',
      'Gli attacchi a distanza mancano casualmente il 50% delle volte',
      'Non può effettuare attacchi di opportunità',
    ],
  },
  confused: {
    name: 'Confuso',
    summary: 'Agisce casualmente ogni round.',
    penalties: [
      '01–25: Agisce normalmente',
      '26–50: Farfuglia in modo incoerente',
      '51–75: Infligge 1d8+mod For danni a se stesso',
      '76–100: Attacca la creatura più vicina',
      'Non può effettuare attacchi di opportunità',
    ],
  },
  dazed: {
    name: 'Frastornato',
    summary: 'Non può agire ma mantiene la CA.',
    penalties: [
      'Non può compiere azioni',
      'Mantiene il bonus di Destrezza alla CA',
      'Può comunque subire attacchi di opportunità',
    ],
  },
  frightened: {
    name: 'Spaventato',
    summary: 'Penalità di paura ai tiri; deve fuggire.',
    penalties: [
      '–2 di paura ai tiri per colpire',
      '–2 di paura ai tiri salvezza',
      '–2 di paura alle prove di abilità',
      '–2 di paura alle prove di caratteristica',
      'Deve fuggire dalla fonte di paura appena possibile',
    ],
  },
  nauseated: {
    name: 'Nauseato',
    summary: 'Limitato a una sola azione di movimento.',
    penalties: [
      'Può compiere solo una singola azione di movimento per turno',
      'Non può attaccare, lanciare incantesimi, concentrarsi o usare la maggior parte delle capacità',
    ],
  },
  paralyzed: {
    name: 'Paralizzato',
    summary: 'Indifeso; For e Des effettivamente pari a 0.',
    penalties: [
      'Forza e Destrezza considerate pari a 0',
      'Non può muoversi né compiere azioni',
      'Se vola cade; se nuota rischia di annegare',
      'Considerato indifeso (+4 ai tiri per colpire in mischia, possibile colpo di grazia)',
    ],
  },
  prone: {
    name: 'Prono',
    summary: 'Penalità in mischia; bonus alla CA contro attacchi a distanza.',
    penalties: [
      '–4 ai tiri per colpire in mischia',
      '+4 alla CA contro attacchi a distanza',
      '–4 alla CA contro attacchi in mischia',
      'Alzarsi è un’azione di movimento che provoca AdO',
    ],
  },
  stunned: {
    name: 'Stordito',
    summary: 'Lascia cadere gli oggetti, non può agire, perde i bonus alla CA.',
    penalties: [
      'Lascia cadere tutto ciò che tiene in mano',
      'Non può compiere azioni',
      '–2 alla CA',
      'Perde il bonus di Destrezza alla CA',
      'Gli attaccanti ottengono +2 per colpire',
    ],
  },
}

export function getConditionInfo(cond: ConditionType, locale: Locale): ConditionInfo {
  if (locale === 'it') {
    return CONDITION_INFO_IT[cond] ?? CONDITION_INFO[cond]
  }
  return CONDITION_INFO[cond]
}

const SKILL_MAP_IT: Record<string, string> = {
  acrobatics: 'Acrobazia',
  appraise: 'Valutare',
  bluff: 'Raggirare',
  climb: 'Scalare',
  craft: 'Artigianato',
  diplomacy: 'Diplomazia',
  'disable device': 'Disattivare Congegni',
  disguise: 'Camuffare',
  'escape artist': 'Artista della Fuga',
  fly: 'Volare',
  'handle animal': 'Addestrare Animali',
  heal: 'Guarire',
  intimidate: 'Intimidire',
  'knowledge (arcana)': 'Conoscenze (Arcane)',
  'knowledge (dungeoneering)': 'Conoscenze (Dungeon)',
  'knowledge (engineering)': 'Conoscenze (Ingegneria)',
  'knowledge (geography)': 'Conoscenze (Geografia)',
  'knowledge (history)': 'Conoscenze (Storia)',
  'knowledge (local)': 'Conoscenze (Locali)',
  'knowledge (nature)': 'Conoscenze (Natura)',
  'knowledge (nobility)': 'Conoscenze (Nobiltà)',
  'knowledge (planes)': 'Conoscenze (Piani)',
  'knowledge (religion)': 'Conoscenze (Religioni)',
  linguistics: 'Linguistica',
  perception: 'Percezione',
  perform: 'Intrattenere',
  profession: 'Professione',
  ride: 'Cavalcare',
  'sense motive': 'Intuizione',
  'sleight of hand': 'Rapidità di Mano',
  spellcraft: 'Sapienza Magica',
  stealth: 'Furtività',
  survival: 'Sopravvivenza',
  swim: 'Nuotare',
  'use magic device': 'Utilizzare Congegni Magici',
}

export function translateSkillName(name: string, locale: Locale): string {
  if (locale !== 'it') return name
  const lower = name.trim().toLowerCase()
  if (SKILL_MAP_IT[lower]) return SKILL_MAP_IT[lower]
  // Handle parenthesized variants like "Craft (Alchemy)", "Perform (Oratory)", "Profession (Sailor)"
  const match = lower.match(/^(craft|perform|profession|knowledge)\s*\((.+)\)$/)
  if (match) {
    const base = match[1]
    const sub = match[2]
    const baseIt =
      base === 'craft'
        ? 'Artigianato'
        : base === 'perform'
        ? 'Intrattenere'
        : base === 'profession'
        ? 'Professione'
        : 'Conoscenze'
    const subMap: Record<string, string> = {
      alchemy: 'Alchimia',
      oratory: 'Oratoria',
      sing: 'Canto',
      dance: 'Danza',
      act: 'Recitazione',
      comedy: 'Commedia',
      percussion: 'Percussioni',
      string: 'Strumenti a Corda',
      wind: 'Strumenti a Fiato',
      keyboard: 'Strumenti a Tastiera',
      weapons: 'Armi',
      armor: 'Armature',
      bows: 'Archi',
      traps: 'Trappole',
    }
    const subIt = subMap[sub.trim()] ?? sub.charAt(0).toUpperCase() + sub.slice(1)
    return `${baseIt} (${subIt})`
  }
  return name
}

const ABILITY_SHORT_IT: Record<string, string> = {
  str: 'FOR',
  dex: 'DES',
  con: 'COS',
  int: 'INT',
  wis: 'SAG',
  cha: 'CAR',
}

const ABILITY_FULL_IT: Record<string, string> = {
  str: 'Forza',
  dex: 'Destrezza',
  con: 'Costituzione',
  int: 'Intelligenza',
  wis: 'Saggezza',
  cha: 'Carisma',
  strength: 'Forza',
  dexterity: 'Destrezza',
  constitution: 'Costituzione',
  intelligence: 'Intelligenza',
  wisdom: 'Saggezza',
  charisma: 'Carisma',
}

export function translateAbilityShort(key: string, locale: Locale): string {
  if (locale !== 'it') return key.toUpperCase()
  return ABILITY_SHORT_IT[key.toLowerCase()] ?? key.toUpperCase()
}

export function translateAbilityFull(key: string, locale: Locale): string {
  if (locale !== 'it') {
    const mapEn: Record<string, string> = {
      str: 'Strength',
      dex: 'Dexterity',
      con: 'Constitution',
      int: 'Intelligence',
      wis: 'Wisdom',
      cha: 'Charisma',
    }
    return mapEn[key.toLowerCase()] ?? key
  }
  return ABILITY_FULL_IT[key.toLowerCase()] ?? key
}

export function translateSaveName(key: string, locale: Locale, short = false): string {
  const k = key.toLowerCase()
  if (locale === 'it') {
    if (k === 'fort' || k === 'fortitude') return short ? 'Temp' : 'Tempra'
    if (k === 'ref' || k === 'reflex') return short ? 'Rifl' : 'Riflessi'
    if (k === 'will') return short ? 'Vol' : 'Volontà'
    return key
  }
  if (k === 'fort' || k === 'fortitude') return short ? 'Fort' : 'Fortitude'
  if (k === 'ref' || k === 'reflex') return short ? 'Ref' : 'Reflex'
  if (k === 'will') return 'Will'
  return key
}

const SLOT_MAP_IT: Record<string, string> = {
  head: 'Testa',
  headband: 'Fascia',
  eyes: 'Occhi',
  shoulders: 'Spalle',
  neck: 'Collo',
  chest: 'Torace',
  body: 'Corpo',
  armor: 'Armatura',
  belt: 'Cintura',
  wrists: 'Polsi',
  hands: 'Mani',
  ring: 'Anello',
  ring1: 'Anello 1',
  ring2: 'Anello 2',
  feet: 'Piedi',
  'main hand': 'Mano Primaria',
  mainhand: 'Mano Primaria',
  'off hand': 'Mano Secondaria',
  offhand: 'Mano Secondaria',
  shield: 'Scudo',
  weapon: 'Arma',
  slotless: 'Senza Slot',
  consumable: 'Consumabile',
  other: 'Altro',
}

export function translateEquipmentSlot(slot: string, locale: Locale): string {
  if (locale !== 'it') return slot
  return SLOT_MAP_IT[slot.toLowerCase()] ?? slot
}

const SCHOOL_MAP_IT: Record<string, string> = {
  abjuration: 'Abiurazione',
  conjuration: 'Evocazione',
  divination: 'Divinazione',
  enchantment: 'Ammaliamento',
  evocation: 'Invocazione',
  illusion: 'Illusione',
  necromancy: 'Necromanzia',
  transmutation: 'Trasmutazione',
  universal: 'Universale',
}

export function translateSchool(school: string, locale: Locale): string {
  if (locale !== 'it') return school
  return SCHOOL_MAP_IT[school.toLowerCase()] ?? school
}

const ACTION_TYPE_IT: Record<string, string> = {
  standard: 'Standard',
  move: 'Movimento',
  swift: 'Veloce',
  immediate: 'Immediata',
  free: 'Gratuita',
  'full-round': 'Round Completo',
  full: 'Round Completo',
  reaction: 'Reazione',
}

export function translateActionType(type: string, locale: Locale): string {
  if (locale !== 'it') return type
  return ACTION_TYPE_IT[type.toLowerCase()] ?? type
}
