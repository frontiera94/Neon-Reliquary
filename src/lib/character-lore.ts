export interface CharacterLore {
  archetype: string
  quote: string
  bio: string
  highlights: string[]
  accentColor: 'cyan' | 'magenta' | 'crimson' | 'violet' | 'amber' | 'emerald'
  classIcon: string
  deityOrPatron?: string
}

export const CHARACTER_LORE_MAP: Record<string, CharacterLore> = {
  'mazikeen-noctis': {
    archetype: 'Hexcrafter & Occult Controller',
    quote: '"Le ombre sussurrano verità che la luce preferisce nascondere."',
    bio: 'Tiefling devota ai segreti oscuri, Mazikeen manipola i fili del destino e le maledizioni ancestrali insieme al suo inseparabile famiglio Salem.',
    highlights: ['Patrono dell’Inganno', 'Malefici Ipotizzanti (Slumber & Evil Eye)', 'Famiglio Arcano (Salem)'],
    accentColor: 'magenta',
    classIcon: 'auto_awesome',
    deityOrPatron: 'Patrono dell’Inganno (Deception)',
  },
  'shotrix-blackburn': {
    archetype: 'Arcane Blade & Spellstriker',
    quote: '"Acciaio e incantesimo: nessuno dei due perdona."',
    bio: 'Nobile decaduto di Cheliax, Shotrix fonde la scherma di precisione con letali scariche magiche incanalate direttamente attraverso la sua lama lunga.',
    highlights: ['Magus Spadaccino', 'Spellstrike Elettrico (Shocking Grasp)', 'Armatura di Maglia Mithral'],
    accentColor: 'cyan',
    classIcon: 'swords',
    deityOrPatron: 'Ordine Arcano di Cheliax',
  },
  'knam': {
    archetype: 'Primal Bloodrager & Juggernaut',
    quote: '"La rabbia nel mio sangue spezza qualsiasi catena."',
    bio: 'Guerriero d’impatto devastante, Knam canalizza la furia ancestrale in scariche di fuoco e forza bruta, brandendo un imponente maglio Earth Breaker.',
    highlights: ['Furia Primordiale', 'Maglio Spezzaterre (Earth Breaker)', 'Schivata Prodigiosa Migliorata'],
    accentColor: 'crimson',
    classIcon: 'local_fire_department',
    deityOrPatron: 'Spiriti Ancestrali',
  },
  'agelmund': {
    archetype: 'Unarmored Ki Master & Ascetic Fighter',
    quote: '"Il corpo è tempio e lama: perfetta disciplina, nessun timore."',
    bio: 'Monaco d’acciaio cresciuto nella disciplina del Ki, Agelmund converte ogni respiro in parate fulminee, raffiche di pugni e totale immunità alle infermità.',
    highlights: ['Raffica di Colpi (Flurry of Blows)', 'Stile Difensivo di Schivata', 'Purezza del Corpo & Riserva Ki'],
    accentColor: 'amber',
    classIcon: 'sports_martial_arts',
    deityOrPatron: 'Via dell’Illuminazione Oscura',
  },
  'mariano-cardamomo': {
    archetype: 'Shadow Finesse & Lethal Infiltrator',
    quote: '"Non sentirai il mio passo, solo il freddo tra le costole."',
    bio: 'Halfling lesto e spietato, Mariano trasforma le ombre urbane nel suo terreno di caccia ideale armato di pugnali gemelli dorati e veleni debilitanti.',
    highlights: ['Attacco Furtivo Letale (Sneak Attack)', 'Pugnali Dorati Gemelli', 'Ferita Debilitante & Furtività Suprema'],
    accentColor: 'violet',
    classIcon: 'visibility_off',
    deityOrPatron: 'Gilda delle Ombre',
  },
  'noorie': {
    archetype: 'Wild Summoner & Pack Mistress',
    quote: '"La natura selvaggia non conosce pietà, solo la legge del branco."',
    bio: 'Druida ferale legata alle forze elementali e alle creature delle profondità boschive, Noorie guida il suo lupo cenerino Ignis e richiama alleati feroci in battaglia.',
    highlights: ['Evocazione Naturale Spontanea', 'Lupo Guardiano (Ignis)', 'Padronanza Elementale Selvatica'],
    accentColor: 'emerald',
    classIcon: 'nature',
    deityOrPatron: 'Natura Primordiale',
  },
}

export const DEFAULT_LORE: CharacterLore = {
  archetype: 'Adventurer of the Reliquary',
  quote: '"Le rovine del vecchio mondo attendono un nuovo custode."',
  bio: 'Un audace avventuriero pronto ad affrontare i pericoli delle lande di Golarion con astuzia e potere.',
  highlights: ['Addestramento Tattico', 'Equipaggiamento Specializzato', 'Retaggio Arcano'],
  accentColor: 'cyan',
  classIcon: 'shield',
}

export function getCharacterLore(characterId: string): CharacterLore {
  return CHARACTER_LORE_MAP[characterId] ?? DEFAULT_LORE
}

export function isPlaceholderPortrait(url?: string): boolean {
  if (!url) return true
  return url.includes('placehold.co') || url.includes('placeholder')
}
