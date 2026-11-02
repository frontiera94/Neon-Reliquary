import { useLanguageStore, type Language } from '../store/useLanguageStore'

export const translations = {
  en: {
    nav: {
      status: 'Status',
      skills: 'Skills',
      combat: 'Combat',
      spells: 'Spells',
      features: 'Features',
      inventory: 'Inventory',
      companion: 'Companion',
    },
    settings: {
      title: 'Settings',
      tools: 'Tools',
      sheetQueue: 'Sheet Queue',
      queueArchive: 'Queue Archive',
      uploadNewSheet: 'Upload New Sheet',
      language: 'Language',
      languageDesc: 'Interface language (game rules, skills, and spells stay in English)',
      english: 'English',
      italian: 'Italiano',
      customRoll: 'Custom Roll',
      clearRollHistory: 'Clear Roll History',
      diceRollLog: 'Dice Roll Log',
      noRolls: 'No rolls yet',
      syncCloud: 'Neon Cloud Sync',
      syncNow: 'Sync Now',
      syncing: 'Syncing...',
      lastSynced: 'Last synced',
      close: 'Close',
      clearChat: 'Clear Chat History',
    },
    sheets: {
      all: 'All',
      new: 'New',
      processing: 'In Progress',
      archived: 'Archived',
      statusNew: 'New',
      statusProcessing: 'In Progress',
      statusArchived: 'Archived',
      changeStatusAria: 'Change sheet status for {name}',
      refreshList: 'Refresh list',
      deleteSheetAria: 'Delete sheet {name}',
      deleteSheetTitle: 'Delete sheet from queue',
      downloadPdf: 'Download original PDF',
      loadingArchive: 'Loading sheet archive...',
      noSheets: 'No sheets currently in queue',
      noSheetsStatus: 'No sheets with status "{status}"',
      byPlayer: 'by {name}',
      character: 'Character',
      selectCharacter: '-- Select character from roster --',
      otherCharacter: '-- Other (type name manually) --',
      customCharacterPlaceholder: 'Character name...',
      notesLabel: 'Notes / Changes (Optional)',
      notesPlaceholder: 'e.g. Leveled up to 5, picked Weapon Focus, updated HP',
      pdfSheetLabel: 'PDF Sheet',
      maxSizeNotice: '* (max 3.2 MB)',
      pdfDragDrop: 'Select or drag & drop PDF file',
      pdfDragActive: 'Drop PDF file here...',
      pdfClickSelect: 'click to select another file',
      passphraseLabel: 'Upload Passphrase',
      passphrasePlaceholder: 'Campaign passphrase',
      submitBtn: 'Upload Sheet & Notify GM',
      uploading: 'Uploading sheet...',
      errPdfOnly: 'Only files with .pdf extension are accepted',
      errMaxSize: 'Maximum allowed file size is 3.2 MB',
      errSelectChar: 'Please select a character from the dropdown',
      errSelectFile: 'Please select the PDF sheet file',
      errPassword: 'Please enter the upload passphrase',
      closeMsg: 'Close message',
      closeErr: 'Close error',
    },
    hud: {
      hp: 'HP',
      tempHp: 'Temp HP',
      nonlethal: 'Nonlethal',
      ac: 'AC',
      touch: 'Touch',
      flatFooted: 'Flat-Footed',
      fort: 'Fort',
      ref: 'Ref',
      will: 'Will',
      init: 'Init',
      heal: 'Heal',
      damage: 'Damage',
      fullRest: 'Full Rest (Heal All)',
      manageSheetsAria: 'Manage Sheets',
      manageSheetsTitle: 'Sheet Archive & Upload',
      sheets: 'Sheets',
      settingsAria: 'Settings',
    },
    combat: {
      rollAndDischarge: 'Roll & Discharge',
      cancelSpellstrike: 'Cancel Spellstrike',
      vsMetal: '+3 vs Metal',
      fullAttack: 'Full Attack',
      singleAttack: 'Attack',
      damage: 'Damage',
      critConfirm: 'Crit Confirm',
      flanking: 'Flanking',
      deadlyAim: 'Deadly Aim',
    },
    skills: {
      title: 'Grimoire Skills',
      subtitle: 'Mechanical Proficiencies & Dynamic Calculations',
      searchPlaceholder: 'Search skills...',
      trainedOnly: 'Trained Only',
      allSkills: 'All Skills',
      noChar: 'No character selected',
      roll: 'Roll',
    },
    inventory: {
      saveLoot: 'Save Loot',
      coinPurse: 'Coin Purse',
      equipment: 'Equipment',
      inventory: 'Inventory',
      searchPlaceholder: 'Search items...',
      weight: 'Weight',
      qty: 'Qty',
    },
    sync: {
      synced: 'Synced with Neon Cloud — click to sync',
      offline: 'Cloud connection offline — saved locally, click to retry',
      localOnly: 'Local storage only (configure DATABASE_URL on Vercel to enable Neon Cloud)',
      syncing: 'Syncing with Neon Cloud...',
    },
  },
  it: {
    nav: {
      status: 'Stato',
      skills: 'Abilità',
      combat: 'Combattimento',
      spells: 'Incantesimi',
      features: 'Capacità',
      inventory: 'Inventario',
      companion: 'Compagno',
    },
    settings: {
      title: 'Impostazioni',
      tools: 'Strumenti',
      sheetQueue: 'Coda Schede',
      queueArchive: 'Archivio Coda',
      uploadNewSheet: 'Carica Nuova Scheda',
      language: 'Lingua',
      languageDesc: 'Lingua interfaccia (regole, abilità e incantesimi rimangono in inglese)',
      english: 'English',
      italian: 'Italiano',
      customRoll: 'Lancio Libero',
      clearRollHistory: 'Cancella Cronologia',
      diceRollLog: 'Registro Dadi',
      noRolls: 'Nessun lancio registrato',
      syncCloud: 'Sincronizzazione Neon Cloud',
      syncNow: 'Sincronizza Ora',
      syncing: 'Sincronizzazione...',
      lastSynced: 'Ultima sincr.',
      close: 'Chiudi',
      clearChat: 'Cancella Chat',
    },
    sheets: {
      all: 'Tutte',
      new: 'Nuove',
      processing: 'In corso',
      archived: 'Archivio',
      statusNew: 'Nuova',
      statusProcessing: 'In lavorazione',
      statusArchived: 'Archiviata',
      changeStatusAria: 'Cambia stato scheda {name}',
      refreshList: 'Aggiorna lista',
      deleteSheetAria: 'Elimina scheda {name}',
      deleteSheetTitle: 'Elimina scheda dalla coda',
      downloadPdf: 'Scarica file PDF originale',
      loadingArchive: 'Caricamento archivio schede...',
      noSheets: 'Nessuna scheda presente in coda',
      noSheetsStatus: 'Nessuna scheda con stato "{status}"',
      byPlayer: 'di {name}',
      character: 'Personaggio',
      selectCharacter: '-- Seleziona personaggio dal roster --',
      otherCharacter: '-- Altro (inserisci nome manuale) --',
      customCharacterPlaceholder: 'Nome personaggio...',
      notesLabel: 'Note / Modifiche (Opzionale)',
      notesPlaceholder: 'es. Salito a livello 5, preso feat Weapon Focus, modificati HP',
      pdfSheetLabel: 'Scheda PDF',
      maxSizeNotice: '* (max 3.2 MB)',
      pdfDragDrop: 'Seleziona o trascina il file PDF',
      pdfDragActive: 'Rilascia il file PDF qui...',
      pdfClickSelect: 'clicca per selezionare un altro file',
      passphraseLabel: 'Password Caricamento',
      passphrasePlaceholder: 'Password della campagna',
      submitBtn: 'Carica Scheda e Notifica Master',
      uploading: 'Caricamento scheda in corso...',
      errPdfOnly: 'Solo file con estensione .pdf sono accettati',
      errMaxSize: 'La dimensione massima consentita è di 3.2 MB',
      errSelectChar: 'Seleziona un personaggio dal menu a tendina',
      errSelectFile: 'Seleziona il file PDF della scheda',
      errPassword: 'Inserisci la password di caricamento',
      closeMsg: 'Chiudi messaggio',
      closeErr: 'Chiudi errore',
    },
    hud: {
      hp: 'PF',
      tempHp: 'PF Temp',
      nonlethal: 'Non letale',
      ac: 'CA',
      touch: 'Contatto',
      flatFooted: 'Sprovvisto',
      fort: 'Temp',
      ref: 'Rifl',
      will: 'Vol',
      init: 'Iniz',
      heal: 'Cura',
      damage: 'Danno',
      fullRest: 'Riposo Completo',
      manageSheetsAria: 'Gestione Schede',
      manageSheetsTitle: 'Archivio e Caricamento Schede',
      sheets: 'Schede',
      settingsAria: 'Impostazioni',
    },
    combat: {
      rollAndDischarge: 'Tira & Scarica',
      cancelSpellstrike: 'Annulla Spellstrike',
      vsMetal: '+3 vs Metallo',
      fullAttack: 'Attacco Completo',
      singleAttack: 'Attacco',
      damage: 'Danni',
      critConfirm: 'Conferma Critico',
      flanking: 'Fiancheggiamento',
      deadlyAim: 'Mira Esiziale',
    },
    skills: {
      title: 'Abilità del Grimorio',
      subtitle: 'Competenze Meccaniche & Calcoli Dinamici',
      searchPlaceholder: 'Cerca abilità...',
      trainedOnly: 'Solo con addestramento',
      allSkills: 'Tutte le abilità',
      noChar: 'Nessun personaggio selezionato',
      roll: 'Tira',
    },
    inventory: {
      saveLoot: 'Salva Loot',
      coinPurse: 'Borsa Monete',
      equipment: 'Equipaggiamento',
      inventory: 'Inventario',
      searchPlaceholder: 'Cerca oggetti...',
      weight: 'Peso',
      qty: 'Qtà',
    },
    sync: {
      synced: 'Stato salvato su Neon Cloud — clicca per sincronizzare',
      offline: 'Connessione cloud assente — stato salvato in locale, clicca per riprovare',
      localOnly: 'Salvataggio solo locale (configura DATABASE_URL su Vercel per abilitare Neon Cloud)',
      syncing: 'Sincronizzazione con Neon Cloud in corso...',
    },
  },
} as const

type Leaves<T> = T extends object
  ? { [K in keyof T]: `${Exclude<K, symbol>}${Leaves<T[K]> extends never ? '' : `.${Leaves<T[K]>}`}` }[keyof T]
  : never

export type TranslationKey = Leaves<typeof translations.en>

export function translate(
  key: string,
  lang: Language = 'en',
  params?: Record<string, string | number>
): string {
  const parts = key.split('.')
  let current: unknown = translations[lang]

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part]
    } else {
      // Fallback to English
      let fallback: unknown = translations.en
      for (const fbPart of parts) {
        if (fallback && typeof fallback === 'object' && fbPart in fallback) {
          fallback = (fallback as Record<string, unknown>)[fbPart]
        } else {
          return key
        }
      }
      current = fallback
      break
    }
  }

  if (typeof current !== 'string') return key

  let result = current
  if (params) {
    for (const [paramKey, paramVal] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal))
    }
  }
  return result
}

export function useTranslation() {
  const language = useLanguageStore((s) => s.language)
  const setLanguage = useLanguageStore((s) => s.setLanguage)
  const toggleLanguage = useLanguageStore((s) => s.toggleLanguage)

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    return translate(key, language, params)
  }

  return { t, language, setLanguage, toggleLanguage }
}
