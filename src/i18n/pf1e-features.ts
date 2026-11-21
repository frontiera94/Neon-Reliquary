import type { Locale } from '../store/useLocaleStore'

const CLASS_MAP_IT: Record<string, string> = {
  monk: 'Monaco',
  bloodrager: 'Ira del Sangue',
  rogue: 'Ladro',
  witch: 'Strega',
  druid: 'Druido',
  inquisitor: 'Inquisitore',
  magus: 'Magus',
  fighter: 'Guerriero',
  wizard: 'Mago',
  cleric: 'Chierico',
  barbarian: 'Barbaro',
  bard: 'Bardo',
  paladin: 'Paladino',
  ranger: 'Ranger',
  sorcerer: 'Stregone',
}

export function translateClassName(cls: string, locale: Locale): string {
  if (locale !== 'it' || !cls) return cls
  const key = cls.trim().toLowerCase()
  return CLASS_MAP_IT[key] ?? cls
}

const RACE_MAP_IT: Record<string, string> = {
  human: 'Umano',
  'human (chelaxian)': 'Umano (Cheliax)',
  halfling: 'Halfling',
  tiefling: 'Tiefling',
  'half-elf': 'Mezzelfo',
  'half-orc': 'Mezzorco',
  elf: 'Elfo',
  dwarf: 'Nano',
  gnome: 'Gnomo',
}

export function translateRaceName(race: string, locale: Locale): string {
  if (locale !== 'it' || !race) return race
  const key = race.trim().toLowerCase()
  return RACE_MAP_IT[key] ?? race
}

const BUFF_NAME_MAP_IT: Record<string, string> = {
  'Jabbing Style': 'Stile del Colpo Rapido (Jabbing Style)',
  'Defensive Spin (+4 Dodge AC on hit)': 'Rotazione Difensiva (+4 CA schivare su colpo)',
  'Axe to Grind (+1 dmg vs sole foe threatened)': 'Rancore (+1 danni vs unico nemico minacciato)',
  'Bloodrage (+4 STR/CON, +2 Will, −2 AC)': 'Ira di Sangue (+4 FOR/COS, +2 Vol, −2 CA)',
  'Power Attack (2H: −2 atk / +6 dmg)': 'Attacco Poderoso (2M: −2 tpc / +6 danni)',
  'Furious Focus (first atk ignores PA penalty)': 'Focus Furioso (1° attacco ignora penalità AP)',
  'Dirty Fighter (+1 dmg when flanking)': 'Combattente Sleale (+1 danni in fiancheggiamento)',
  'Sneak Attack +3d6': 'Attacco Furtivo +3d6',
  'Two-Weapon Fighting (−2 primary / −2 off-hand)': 'Combattere con Due Armi (−2 primaria / −2 secondaria)',
  'Flanking (+2 attack)': 'Fiancheggiamento (+2 tpc)',
  'Mage Armor': 'Armatura Magica',
  'Barkskin (+2 Natural Armor)': 'Pelle Corteccia (+2 Armatura Naturale)',
  'Power Attack': 'Attacco Poderoso',
  'Deadly Aim': 'Mira Letale',
  'Sneak Attack': 'Attacco Furtivo',
  Flanking: 'Fiancheggiamento',
  'Judgment: Destruction': 'Giudizio: Distruzione',
  'Bane (active)': 'Anatema (attivo)',
  'Arcane Pool (+2 weapon)': 'Riserva Arcana (arma +2)',
  'Shield (cast)': 'Scudo (lanciato)',
  'Spell Combat (−2 attacks)': 'Combattimento Incantato (−2 tpc)',
  'True Strike': 'Colpo Accurato',
}

export function translateBuffName(name: string, locale: Locale): string {
  if (locale !== 'it' || !name) return name
  return BUFF_NAME_MAP_IT[name] ?? name
}

const RESOURCE_NAME_MAP_IT: Record<string, string> = {
  'Ki Pool': 'Riserva Ki',
  'Stunning Fist': 'Pugno Stordente',
  'Stamina Pool': 'Riserva di Stamina',
  'Bloodrage Rounds': 'Round di Ira di Sangue',
  'Lvl 1 Spells': 'Incantesimi Liv. 1',
  'Underhanded (max sneak dmg surprise)': 'Colpo Basso (danni furtivi max a sorpresa)',
  'Major Magic: Vanish (2/day)': 'Magia Maggiore: Sparire (2/g)',
  'Potion of Cure Light Wounds (1d8+1)': 'Pozione di Cura Ferite Leggere (1d8+1)',
  'Darkness (SLA)': 'Oscurità (Capacità Magica)',
  'Flight Hex: Fly (1-min increments)': 'Fattura Volo: Volare (incrementi 1 min)',
  'Flight Hex: Levitate': 'Fattura Volo: Levitazione',
  'Fire Bolt (ranged touch 1d6+2)': 'Dardo di Fuoco (contatto a distanza 1d6+2)',
  'Wild Shape (5 hrs)': 'Forma Selvatica (5 ore)',
  'Minor Magic': 'Magia Minore',
  'Improved Evasion': 'Eludere Migliorato',
  Judgment: 'Giudizio',
  Bane: 'Anatema',
  'Arcane Pool': 'Riserva Arcana',
}

export function translateResourceName(name: string, locale: Locale): string {
  if (locale !== 'it' || !name) return name
  return RESOURCE_NAME_MAP_IT[name] ?? name
}

interface ClassAbilityTranslation {
  name: string
  description: string
}

const CLASS_ABILITY_IT: Record<string, ClassAbilityTranslation> = {
  'Monk AC Bonus (Unarmored)': {
    name: 'Bonus CA del Monaco (Senza Armatura)',
    description:
      'Quando non indossa armatura e non è ingombrato, Agelmund aggiunge il modificatore di SAG (+2) alla CA e alla DMC, più +1 al 4° livello. La sua CA di 17 = 10 + DES(+2) + Schivare(+1) + bonus SAG/Monaco(+4). La CA a contatto equivale alla CA totale (17).',
  },
  'Purity of Body (Lvl 5)': {
    name: 'Purezza del Corpo (Liv. 5)',
    description:
      'Al 5° livello, il monaco ottiene immunità a tutte le malattie, incluse quelle soprannaturali e magiche.',
  },
  'Style Strike (Defensive Spin)': {
    name: 'Colpo di Stile (Rotazione Difensiva)',
    description:
      'Al 5° livello, il monaco impara un tipo di colpo di stile. Quando effettua una raffica di colpi, può designare un colpo senz’armi come colpo di stile (Rotazione Difensiva: +4 bonus di schivare alla CA contro il bersaglio se colpisce).',
  },
  Evasion: {
    name: 'Eludere',
    description:
      'Se supera un tiro salvezza sui Riflessi contro un attacco che normalmente infligge metà danni con un tiro salvezza riuscito, non subisce invece alcun danno.',
  },
  'Fast Movement (Ex)': {
    name: 'Movimento Veloce (Str)',
    description:
      'Al 3° livello, il monaco ottiene un bonus di potenziamento alla velocità sul terreno (+3 m / +10 ft al 5° livello, totale 12 m / 40 ft). Perso se indossa armatura o trasporta carico medio o pesante.',
  },
  'Still Mind': {
    name: 'Mente Immobile',
    description: 'Bonus di +2 ai tiri salvezza contro incantesimi ed effetti di ammaliamento.',
  },
  'Wholeness of Body (Ki Power)': {
    name: 'Integrità del Corpo (Potere Ki)',
    description:
      'Cura le proprie ferite come azione standard: spendi 2 punti ki per curare 1d8 + livello da monaco (1d8+5 PF).',
  },
  'Uncanny Dodge': {
    name: 'Schivare Prodigioso',
    description:
      'Knam non può essere colto impreparato e non perde il bonus di DES alla CA se l’attaccante è invisibile. Per questo la sua CA da impreparato equivale alla CA totale (19).',
  },
  'Improved Uncanny Dodge (Lvl 5)': {
    name: 'Schivare Prodigioso Migliorato (Liv. 5)',
    description:
      'Knam non può più essere fiancheggiato. Questa difesa impedisce ai ladri di effettuare attacchi furtivi fiancheggiandolo, a meno che l’attaccante non sia un ladro di almeno 9° livello.',
  },
  'Blood Casting': {
    name: 'Incantare nel Sangue',
    description:
      'Knam può lanciare incantesimi da ira del sangue anche durante l’ira di sangue e tentare prove di concentrazione in questo stato. Può lanciare solo incantesimi della lista da ira del sangue.',
  },
  'Natural Armor +1': {
    name: 'Armatura Naturale +1',
    description:
      'La pelliccia eccezionalmente spessa di Knam conferisce un bonus di armatura naturale +1 alla CA (premio del GM). Già incluso nella CA totale.',
  },
  'Debilitating Injury': {
    name: 'Menomazione Debilitante',
    description:
      'Dopo aver inflitto danni da attacco furtivo, scegli una penalità sul bersaglio per 1 round: Confuso (−2 CA, accumulabile fino a −4 contro Mariano), Disorientato (−2 tpc, accumulabile fino a −4 contro Mariano) o Ostacolato (velocità dimezzata, niente passo da 1,5 m). Ulteriori attacchi furtivi estendono la durata.',
  },
  "Rogue's Edge (Acrobatics)": {
    name: 'Limite del Ladro (Acrobazia)',
    description:
      'Capacità da Ladro Unchained di 5° livello. Sblocca i poteri di Acrobazia: attraversa quadretti minacciati a velocità normale aumentando la CD di +5 (anziché +10), e non perde il bonus di DES tentando prove di Acrobazia con CD 20 o inferiore.',
  },
  'Minor Magic: Acid Splash': {
    name: 'Magia Minore: Spruzzo Acido',
    description:
      'Dote da ladro — lancia Spruzzo Acido a volontà come capacità magica. LI 5, CD 14 (su INT). Attacco di contatto a distanza che infligge 1d3 danni da acido. Sostituibile tramite il talento Ladro Studioso (10 min con un libro degli incantesimi).',
  },
  'Major Magic: Vanish (2/day)': {
    name: 'Magia Maggiore: Sparire (2/giorno)',
    description:
      'Dote da ladro — lancia Sparire 2 volte al giorno come capacità magica. LI 5, CD 15 (su INT). Durata 1 round/livello (5 round). Sostituibile tramite il talento Ladro Studioso (10 min con un libro degli incantesimi).',
  },
  'Underhanded (3/day)': {
    name: 'Colpo Basso (3/giorno)',
    description:
      'Dote da ladro — bonus di circostanza +4 a Rapidità di Mano per nascondere un’arma. Durante il round di sorpresa con un’arma nascosta di cui l’avversario non sapeva: l’attacco furtivo infligge automaticamente il massimo dei danni (nessun tiro richiesto). Utilizzabile mod CAR volte al giorno (3/g).',
  },
  'Finesse Training (Dagger)': {
    name: 'Addestramento nella Precisione (Pugnale)',
    description:
      'Usa DES (+5) invece di FOR (−2) per i tiri per colpire con tutte le armi leggere (Arma Accurata). Usa inoltre DES (+5) invece di FOR (−2) per i tiri per i danni specificamente con i pugnali. Pugnale Placcato Oro: +10 al colpire (BAB 3 + DES 5 + taglia 1 + Arma Focalizzata 1), 1d3+5 danni.',
  },
  'Halfling Racial Traits': {
    name: 'Tratti Razziali Halfling',
    description:
      'Lingue: Comune, Nanico, Elfico, Gnomesco, Goblin, Halfling. +1 bonus di taglia a CA e tiri per colpire. +1 a tutti i tiri salvezza (Fortuna Halfling). +2 razziale ai TS contro paura (Senza Paura). +2 Percezione (Sensi Acuti). +2 Acrobazia e Scalare (Passo Sicuro). +4 taglia a Furtività. Velocità 6 m (20 ft).',
  },
  "Witch's Familiar — Salem (a.k.a. Blackjack)": {
    name: 'Famiglio della Strega — Salem (detto Blackjack)',
    description:
      'Salem è il gatto nero famiglio di Maze (bestia magica, 24 PF, INT 8). Custodisce tutti gli incantesimi di Maze, conferisce Allerta a portata di braccio, trasmette incantesimi a contatto/fatture, condivide un legame empatico fino a 1,5 km e al 5° livello può parlare verbalmente con la padrona. Salem ha resistenza Freddo/Elettricità/Fuoco 1.',
  },
  'Healing Patron': {
    name: 'Patrono della Guarigione',
    description:
      'Il patrono di Maze è una forza misteriosa legata alla Guarigione (Divinità: Mammon). Ai livelli pari aggiunge automaticamente nuovi incantesimi alla lista del famiglio: Rimuovi Paura (1°), Ristorare Inferiore (2°).',
  },
  'Hex Save DC': {
    name: 'CD Tiro Salvezza Fatture',
    description:
      'Tutte le fatture di Maze hanno CD 17 (10 + 2 metà livello + 5 modificatore INT). Bonus prova di Concentrazione: +10 (LI 5 + INT 5).',
  },
  'Darkness (Spell-Like Ability)': {
    name: 'Oscurità (Capacità Magica)',
    description:
      'Maze può lanciare Oscurità 1/giorno come capacità magica (tratto razziale Tiefling). Durata 5 minuti (LI 5), raggio Contatto, irradia oscurità in un raggio di 6 m (20 ft).',
  },
  "Spontaneous Casting (Summon Nature's Ally)": {
    name: 'Lancio Spontaneo (Evoca Alleato Naturale)',
    description:
      'Noorie può sacrificare qualsiasi incantesimo preparato per lanciare spontaneamente Evoca Alleato Naturale di livello pari o inferiore. Essendo NM, applica l’archetipo Immondo alle creature evocate (RD 2/magia, res. 5 freddo/fuoco/elettricità, Punire il Bene 1/g, Scurovisione 18 m). Non può evocare creature Celestiali.',
  },
  'Nature Sense': {
    name: 'Senso della Natura',
    description: 'Bonus di +2 alle prove di Conoscenze (Natura) e Sopravvivenza. Già incluso nei totali.',
  },
  'Wild Empathy (+5)': {
    name: 'Empatia Selvatica (+5)',
    description:
      'Migliora l’atteggiamento di un animale entro 9 m (funziona come Diplomazia: 1d20+5; richiede 1 minuto). Funziona su bestie magiche con INT 1–2 con penalità −4.',
  },
  'Trackless Step / Woodland Stride': {
    name: 'Passo Senza Tracce / Andatura nel Bosco',
    description:
      'Noorie non lascia tracce in ambienti naturali (non può essere seguita) e può muoversi attraverso il sottobosco naturale a velocità piena senza subire danni o rallentamenti.',
  },
  'Wisdom in the Flesh (Stealth)': {
    name: 'Saggezza nella Carne (Furtività)',
    description:
      'Noorie effettua le prove di Furtività usando il modificatore di Saggezza (+5) invece di Destrezza (+3). Furtività è considerata abilità di classe. Totale Furtività: 10 (SAG 5 + gradi 2 + classe 3).',
  },
  'Judgment of Justice': {
    name: 'Giudizio di Giustizia',
    description: 'L’inquisitore ottiene un bonus sacro di +3 ai tiri per colpire.',
  },
  'Arcane Pool (6 pts/day · +2)': {
    name: 'Riserva Arcana (6 punti/giorno · +2)',
    description:
      'Spendi 1 punto come azione veloce per conferire a un’arma impugnata un bonus di potenziamento +2 per 1 minuto (accumulabile fino a +5). Puoi scambiare il bonus per proprietà dell’arma (Infuocata, Gelida, Folgorante, Affilata, ecc., lasciando almeno +1). Inoltre: Richiamo Incantesimi — spendi punti pari al livello dell’incantesimo (min 1) per ripreparare un incantesimo lanciato come azione veloce.',
  },
  'Spell Combat': {
    name: 'Combattimento Incantato',
    description:
      'Come azione di round completo, effettua tutti gli attacchi in mischia a −2 e lancia un incantesimo da Magus (tempo di lancio 1 azione standard). Puoi lanciare sulla difensiva aggiungendo fino al bonus di INT (+4) come bonus di circostanza alla concentrazione e penalità aggiuntiva agli attacchi.',
  },
  Spellstrike: {
    name: 'Colpo Incantato (Spellstrike)',
    description:
      'Quando lanci un incantesimo a contatto della lista da Magus, trasmettilo attraverso la tua arma come attacco in mischia gratuito al BAB più alto (invece del normale attacco di contatto). Se colpisce, infligge i danni dell’arma + gli effetti dell’incantesimo. Usa la minaccia di critico dell’arma (18-20 sullo Stocco), ma l’incantesimo moltiplica solo ×2.',
  },
  'Armor Proficiency (Light)': {
    name: 'Competenza nelle Armature (Leggere)',
    description:
      'Può lanciare incantesimi da Magus indossando armature leggere (Armatura di Cuoio Borchiato) senza incorrere nella probabilità di fallimento incantesimi arcani.',
  },
}

export function translateClassAbility<T extends { name: string; description: string }>(
  ability: T,
  locale: Locale
): T {
  if (locale !== 'it') return ability
  const tr = CLASS_ABILITY_IT[ability.name]
  if (!tr) return ability
  return {
    ...ability,
    name: tr.name,
    description: tr.description,
  }
}

interface FeatTranslation {
  name: string
  shortDesc: string
  fullDesc?: string
}

const FEAT_IT: Record<string, FeatTranslation> = {
  'Flurry of Blows': {
    name: 'Raffica di Colpi',
    shortDesc:
      'Attacco completo: effettua un attacco aggiuntivo al BAB massimo (+10/+10). Puoi spendere 1 ki per un terzo attacco.',
  },
  'Stunning Fist (5/day, DC 14)': {
    name: 'Pugno Stordente (5/g, CD 14)',
    shortDesc:
      'Dichiara prima del tiro per colpire. Se colpisce: Tempra CD 14 o il bersaglio è stordito per 1 round. Dal 4° liv. può affaticare invece di stordire.',
  },
  'Ki Pool (6 pts)': {
    name: 'Riserva Ki (6 punti)',
    shortDesc:
      'Riserva di energia soprannaturale. 1 pt = attacco extra in raffica. 2 pt = Integrità del Corpo (cura 1d8+5).',
  },
  'Jabbing Style': {
    name: 'Stile del Colpo Rapido (Jabbing Style)',
    shortDesc:
      'Quando colpisci un bersaglio con un colpo senz’armi che hai già colpito in questo round, infliggi +1d6 danni extra.',
  },
  'Defensive Spin (Style Strike)': {
    name: 'Rotazione Difensiva (Colpo di Stile)',
    shortDesc:
      'Se colpisci con il pugno in raffica: ottieni bonus di schivare +4 alla CA contro il bersaglio fino all’inizio del tuo prossimo turno.',
  },
  'Combat Stamina (7 pts)': {
    name: 'Stamina da Combattimento (7 punti)',
    shortDesc:
      'Spendi fino a 5 punti stamina per ottenere un bonus di competenza ai tiri per colpire, o usa trucchi da combattimento.',
  },
  'Improved Grapple (Granted)': {
    name: 'Lottare Migliorato (Concesso)',
    shortDesc:
      'Nessun AdO quando entri in lotta. +2 alle prove di BMC in lotta e +2 alla DMC contro tentativi di lotta.',
  },
  'Deflect Arrows (Granted)': {
    name: 'Deviare Frecce (Concesso)',
    shortDesc:
      'Una volta per round, con una mano libera, devia un attacco con arma a distanza evitando di subire danni.',
  },
  Dodge: {
    name: 'Schivare',
    shortDesc: 'Bonus di schivare +1 alla CA (già incluso nella CA 17).',
  },
  'Extra Ki': {
    name: 'Ki Extra',
    shortDesc: 'Aggiunge +2 punti ki alla tua riserva ki.',
  },
  Alertness: {
    name: 'Allerta',
    shortDesc: 'Bonus di +2 alle prove di Percezione e Intuizione.',
  },
  'Bloodrage (16 rounds/day)': {
    name: 'Ira di Sangue (16 round/giorno)',
    shortDesc: '+4 morale a FOR, +4 COS, +2 TS Volontà, −2 CA. Azione gratuita per entrare/uscire.',
  },
  'Aberrant Bloodline': {
    name: 'Stirpe Aberrante',
    shortDesc: 'La stirpe conferisce +1,5 m (+5 ft) di portata durante l’ira di sangue e poteri alieni.',
  },
  'Power Attack': {
    name: 'Attacco Poderoso',
    shortDesc: '−2 tiro per colpire / +4 danni (×1,5 a 2 mani = +6 danni con Spaccaterra).',
  },
  'Furious Focus': {
    name: 'Focus Furioso',
    shortDesc:
      'Usando Attacco Poderoso con un’arma a due mani, il primo attacco del round ignora la penalità di −2.',
  },
  Toughness: {
    name: 'Robustezza',
    shortDesc: '+5 punti ferita.',
  },
  'Combat Reflexes': {
    name: 'Riflessi in Combattimento',
    shortDesc:
      'Effettua 2 attacchi di opportunità aggiuntivi per round; puoi effettuare AdO anche da impreparato.',
  },
  'Improved Initiative': {
    name: 'Iniziativa Migliorata',
    shortDesc: 'Bonus di +4 alle prove di iniziativa.',
  },
  'Great Fortitude': {
    name: 'Tempra Possente',
    shortDesc: 'Bonus di +2 a tutti i tiri salvezza sulla Tempra.',
  },
  'Iron Will': {
    name: 'Volontà di Ferro',
    shortDesc: 'Bonus di +2 a tutti i tiri salvezza sulla Volontà.',
  },
  'Improved Disarm': {
    name: 'Disarmare Migliorato',
    shortDesc: '+2 a BMC e DMC per disarmare; non provoca attacchi di opportunità.',
  },
  Persuasive: {
    name: 'Persuasivo',
    shortDesc: 'Bonus di +2 alle prove di Diplomazia e Intimidire.',
  },
  'Eschew Materials': {
    name: 'Escludere Materiali',
    shortDesc: 'Lancia incantesimi senza componenti materiali minori dal costo di 1 mo o inferiore.',
  },
  'Sneak Attack +3d6': {
    name: 'Attacco Furtivo +3d6',
    shortDesc:
      '+3d6 danni quando il bersaglio perde il bonus di DES alla CA o è fiancheggiato. A distanza solo entro 9 m.',
  },
  'Finesse Training (Dagger)': {
    name: 'Addestramento nella Precisione (Pugnale)',
    shortDesc:
      'Arma Accurata gratuita. Aggiunge il modificatore di DES invece di FOR ai danni con i pugnali.',
  },
  'Uncanny Dodge': {
    name: 'Schivare Prodigioso',
    shortDesc:
      'Non può essere colto impreparato; mantiene il bonus di DES alla CA anche contro attaccanti invisibili.',
  },
  Evasion: {
    name: 'Eludere',
    shortDesc:
      'Con un tiro salvezza sui Riflessi riuscito contro un effetto a metà danni, non subisce alcun danno.',
  },
  'Danger Sense +1': {
    name: 'Percezione del Pericolo +1',
    shortDesc: '+1 TS Riflessi vs trappole, +1 CA schivare vs attacchi di trappole, +1 Percezione vs sorpresa.',
  },
  'Debilitating Injury': {
    name: 'Menomazione Debilitante',
    shortDesc:
      'Dopo un attacco furtivo, infliggi per 1 round: −2 CA (Confuso), −2 tpc (Disorientato) o metà velocità (Ostacolato).',
  },
  Trapfinding: {
    name: 'Scoprire Trappole',
    shortDesc: '+2 Percezione per trovare trappole, +2 Disattivare Congegni. Può disattivare trappole magiche.',
  },
  'Minor Magic: Acid Splash': {
    name: 'Magia Minore: Spruzzo Acido',
    shortDesc: 'Lancia Spruzzo Acido a volontà come capacità magica (LI 5, CD 14).',
  },
  Underhanded: {
    name: 'Colpo Basso',
    shortDesc:
      '+4 Rapidità di Mano per nascondere armi. Nel round di sorpresa con arma nascosta: l’attacco furtivo infligge danni massimi automatici.',
  },
  'Weapon Finesse': {
    name: 'Arma Accurata',
    shortDesc: 'Usa DES invece di FOR per i tiri per colpire con armi leggere, stocchi e fruste.',
  },
  'Weapon Focus (Dagger)': {
    name: 'Arma Focalizzata (Pugnale)',
    shortDesc: 'Bonus di +1 a tutti i tiri per colpire effettuati con i pugnali.',
  },
  'Two-Weapon Fighting': {
    name: 'Combattere con Due Armi',
    shortDesc:
      'Combatti con un’arma per mano. Penalità mano primaria −2, mano secondaria −2 (con arma leggera nella secondaria).',
  },
  'Skill Focus (Stealth)': {
    name: 'Abilità Focalizzata (Furtività)',
    shortDesc: 'Bonus di +3 alle prove di Furtività. Aumenta a +6 con 10+ gradi.',
  },
  'Extra Unchained Rogue Talent (2x)': {
    name: 'Dote da Ladro Extra (2×)',
    shortDesc: 'Ottieni due doti da ladro unchained aggiuntive (Colpo Basso e Magia Maggiore).',
  },
  'Major Magic: Vanish (2/day)': {
    name: 'Magia Maggiore: Sparire (2/giorno)',
    shortDesc: 'Lancia Sparire 2/giorno come capacità magica (LI 5, CD 15).',
  },
  "Rogue's Edge (Acrobatics)": {
    name: 'Limite del Ladro (Acrobazia)',
    shortDesc:
      'Sblocco Abilità Acrobazia (5 gradi): attraversa quadretti minacciati a velocità normale con CD +5 (anziché +10); mantieni DES alla CA su CD ≤ 20.',
  },
  'Bookish Rogue': {
    name: 'Ladro Studioso',
    shortDesc:
      'Trascorri 10 minuti con un libro degli incantesimi per sostituire permanentemente l’incantesimo di Magia Minore o Maggiore.',
  },
  'Halfling Racial Traits': {
    name: 'Tratti Razziali Halfling',
    shortDesc:
      'Senza Paura (+2 vs paura), Fortuna Halfling (+1 tutti i TS), Sensi Acuti (+2 Percezione), Passo Sicuro (+2 Acrobazia/Scalare), taglia (+1 CA/tpc), velocità 6 m.',
  },
  'Bonus Critical Confirmation (Halfling Favored Class: Daggers 3x)': {
    name: 'Conferma Critico Bonus (Classe Preferita Halfling: Pugnali 3×)',
    shortDesc: 'Bonus di circostanza +1 ai tiri per confermare i colpi critici con i pugnali.',
  },
  'Character Traits': {
    name: 'Tratti del Personaggio',
    shortDesc:
      'Good Slip (+1 Raggirare, 1/g ritira Vol vicino ad alleato umano del Cheliax), Fede Indomabile (+1 Vol), Reattivo (+2 Iniziativa).',
  },
  'Hex: Evil Eye': {
    name: 'Fattura: Malocchio',
    shortDesc:
      'Il bersaglio entro 9 m subisce −2 a una categoria di statistiche scelta per 8 round (Vol CD 17 = 1 round).',
  },
  'Hex: Misfortune': {
    name: 'Fattura: Sfortuna',
    shortDesc: 'Il bersaglio tira due volte e tiene il risultato peggiore per 1 round (Vol CD 17 nega).',
  },
  'Hex: Slumber': {
    name: 'Fattura: Sonno',
    shortDesc:
      'Il bersaglio di qualsiasi DV cade in un sonno magico per 5 round (Vol CD 17 nega).',
  },
  'Hex: Fortune': {
    name: 'Fattura: Fortuna',
    shortDesc: 'Concede a una creatura entro 9 m di ritirare una prova d20 per 1 round.',
  },
  'Hex: Cackle': {
    name: 'Fattura: Risatina',
    shortDesc: 'Azione di movimento: estende di 1 round la durata di una fattura attiva (raggio 9 m).',
  },
  'Hex: Flight (Su)': {
    name: 'Fattura: Volo (Sop)',
    shortDesc:
      'Caduta Morbida a volontà, +4 razziale Nuotare, Levitazione 1/g e Volare 5 min/g (incrementi di 1 min).',
  },
  'Fiendish Resistance': {
    name: 'Resistenza Immonda',
    shortDesc: 'Resistenza a Freddo 5, Elettricità 5, Fuoco 5 (tratto razziale Tiefling).',
  },
  'Alertness (via Familiar)': {
    name: 'Allerta (tramite Famiglio)',
    shortDesc: '+2 a Percezione e Intuizione finché Salem è entro portata di braccio.',
  },
  'Fire Bolt (Sp) — 8/day': {
    name: 'Dardo di Fuoco (Mag) — 8/giorno',
    shortDesc:
      'Azione standard: attacco di contatto a distanza entro 9 m che infligge 1d6+2 danni da fuoco.',
  },
  'Wild Shape (1/day, 5 hours)': {
    name: 'Forma Selvatica (1/giorno, 5 ore)',
    shortDesc: 'Trasformati in un animale Piccolo o Medio una volta al giorno fino a 5 ore.',
  },
  'Natural Spell': {
    name: 'Incantesimi Naturali',
    shortDesc: 'Lancia incantesimi normalmente (V, S, M, F) anche mentre sei trasformato con Forma Selvatica.',
  },
  'Combat Casting': {
    name: 'Incantare in Combattimento',
    shortDesc: '+4 alle prove di concentrazione quando lanci sulla difensiva o mentre sei in lotta.',
  },
  'Endure Pain': {
    name: 'Sopportare il Dolore',
    shortDesc:
      'Tenta un TS sulla Tempra (CD 10 + danni non letali subiti) per dimezzare i danni non letali in arrivo.',
  },
  'Flame-Tested Survivor': {
    name: 'Sopravvissuto alle Fiamme',
    shortDesc: 'Temprato dalle fiamme più ardenti; il fuoco non ti incute più timore.',
  },
  "Resist Nature's Lure": {
    name: 'Resistere al Richiamo della Natura',
    shortDesc:
      'Bonus di +4 ai TS contro capacità magiche/soprannaturali dei folletti e contro incantesimi che bersagliano vegetali.',
  },
  'Nature Magic': {
    name: 'Magia della Natura',
    shortDesc:
      'Orientamento come capacità magica costante a volontà. Un’orazione da druido aggiuntiva 1/giorno come capacità magica.',
  },
  'Ash Subdomain (Fire Domain)': {
    name: 'Sottodominio della Cenere (Dominio del Fuoco)',
    shortDesc:
      'Resistenza al Fuoco 5 (passiva). Incantesimi di dominio: Mani Brucianti (1°), Fiamma (2°), Palla di Fuoco (3°).',
  },
  'Sneak Attack': {
    name: 'Attacco Furtivo',
    shortDesc: 'L’attacco del ladro infligge danni extra quando coglie gli avversari impreparati.',
  },
  'Stern Gaze': {
    name: 'Sguardo Severo',
    shortDesc: 'Gli inquisitori sono abili nel percepire l’inganno e intimidire i loro nemici.',
  },
  'Cunning Initiative': {
    name: 'Iniziativa Scaltra',
    shortDesc: 'Aggiungi il modificatore di Saggezza alle prove di iniziativa.',
  },
  Track: {
    name: 'Seguire Tracce',
    shortDesc:
      'L’inquisitore aggiunge metà del suo livello alle prove di Sopravvivenza per seguire o identificare tracce.',
  },
  'Solo Tactics': {
    name: 'Tattiche Solitarie',
    shortDesc:
      'Tutti gli alleati dell’inquisitore sono considerati come se possedessero i suoi stessi talenti di squadra.',
  },
  Bane: {
    name: 'Anatema',
    shortDesc: 'L’arma dell’inquisitore risplende di potere contro un tipo di nemico designato.',
  },
  'Greater Bane': {
    name: 'Anatema Superiore',
    shortDesc: 'La capacità Anatema dell’inquisitore infligge 2d6 danni aggiuntivi.',
  },
  'Weapon Focus (Rapier)': {
    name: 'Arma Focalizzata (Stocco)',
    shortDesc: 'Bonus di +1 a tutti i tiri per colpire con lo Stocco (già incluso nel +8).',
  },
  "Lamashtu's Mark": {
    name: 'Marchio di Lamashtu',
    shortDesc:
      '1/giorno su un colpo in mischia contro un nemico non malvagio: il CAR del bersaglio è ridotto di 1d4 per 1 ora (Tempra CD 13 nega).',
  },
  'Burning Spell (Metamagic)': {
    name: 'Incantesimo Bruciante (Metamagia)',
    shortDesc:
      'Gli incantesimi di acido/fuoco infliggono danni aggiuntivi pari a 2× livello incantesimo all’inizio del prossimo turno del bersaglio (+2 livelli slot).',
  },
  'Intensified Spell (Metamagic)': {
    name: 'Incantesimo Intensificato (Metamagia)',
    shortDesc: 'Aumenta il numero massimo di dadi di danno di un incantesimo di 5 livelli (+1 livello slot).',
  },
  'Craft Wondrous Item': {
    name: 'Creare Oggetti Meravigliosi',
    shortDesc:
      'Puoi creare oggetti magici meravigliosi. Costa la metà del prezzo base in materie prime.',
  },
}

export function translateFeat<T extends { name: string; shortDesc: string; fullDesc: string }>(
  feat: T,
  locale: Locale
): T {
  if (locale !== 'it') return feat
  const tr = FEAT_IT[feat.name]
  if (!tr) return feat
  return {
    ...feat,
    name: tr.name,
    shortDesc: tr.shortDesc,
    fullDesc: tr.fullDesc ?? tr.shortDesc,
  }
}
