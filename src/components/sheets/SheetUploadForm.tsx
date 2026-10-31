import { useState, useRef } from 'react'
import { useSheetQueueStore } from '../../store/useSheetQueueStore'
import { useCharacterStore } from '../../store/useCharacterStore'

interface SheetUploadFormProps {
  onSuccess?: () => void
}

const DEFAULT_CHARACTERS = [
  'Agelmund',
  'Knam',
  'Mariano Cardamomo',
  'Mazikeen Noctis',
  'Noorie',
  'Shotrix Blackburn',
]

export function SheetUploadForm({ onSuccess }: SheetUploadFormProps) {
  const { uploadSheet, isUploading, error, uploadSuccessMessage, clearMessages } = useSheetQueueStore()
  const storeCharacters = useCharacterStore((s) => s.characters)

  const characterList = Array.from(
    new Set([
      ...storeCharacters.map((c) => c.name.trim()).filter(Boolean),
      ...DEFAULT_CHARACTERS,
    ])
  ).sort((a, b) => a.localeCompare(b, 'it'))

  const [selectedCharacter, setSelectedCharacter] = useState('')
  const [customCharacterName, setCustomCharacterName] = useState('')
  const [notes, setNotes] = useState('')
  const [password, setPassword] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (file: File | null) => {
    setFileError(null)
    clearMessages()
    if (!file) {
      setSelectedFile(null)
      return
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setFileError('Solo file con estensione .pdf sono accettati')
      setSelectedFile(null)
      return
    }

    if (file.size > 3.2 * 1024 * 1024) {
      setFileError('La dimensione massima consentita è di 3.2 MB')
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFileError(null)

    const finalCharacterName =
      selectedCharacter === '__other__'
        ? customCharacterName.trim()
        : selectedCharacter.trim()

    if (!finalCharacterName) {
      setFileError('Seleziona un personaggio dal menu a tendina')
      return
    }
    if (!selectedFile) {
      setFileError('Seleziona il file PDF della scheda')
      return
    }
    if (!password) {
      setFileError('Inserisci la password di caricamento')
      return
    }

    const res = await uploadSheet({
      characterName: finalCharacterName,
      notes: notes.trim(),
      file: selectedFile,
      password,
    })

    if (res.ok) {
      // Clear form on success
      setSelectedCharacter('')
      setCustomCharacterName('')
      setNotes('')
      setPassword('')
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Success banner */}
      {uploadSuccessMessage && (
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-start gap-2.5">
          <span className="material-symbols-outlined text-primary text-sm flex-shrink-0 mt-0.5">
            check_circle
          </span>
          <p className="font-label text-xs text-primary leading-relaxed">{uploadSuccessMessage}</p>
        </div>
      )}

      {/* Error banner */}
      {(error || fileError) && (
        <div className="p-3 rounded-xl bg-error/10 border border-error/30 flex items-start gap-2.5">
          <span className="material-symbols-outlined text-error text-sm flex-shrink-0 mt-0.5">
            error
          </span>
          <p className="font-label text-xs text-error leading-relaxed">{error || fileError}</p>
        </div>
      )}

      {/* Character Dropdown */}
      <div>
        <label
          htmlFor="sheet-character-select"
          className="block font-label text-[11px] text-tertiary uppercase tracking-wider mb-1.5"
        >
          Personaggio <span className="text-primary">*</span>
        </label>
        <select
          id="sheet-character-select"
          value={selectedCharacter}
          onChange={(e) => {
            setSelectedCharacter(e.target.value)
            setFileError(null)
          }}
          aria-label="Seleziona Personaggio"
          className="w-full bg-surface-container-high/80 px-3.5 py-2.5 font-label text-xs text-on-surface rounded-xl border border-white/10 focus:border-primary/50 focus:outline-none focus:shadow-[0_0_12px_rgba(0,240,255,0.2)] transition-all cursor-pointer"
        >
          <option value="" disabled className="bg-surface-container text-tertiary">
            -- Seleziona un personaggio --
          </option>
          {characterList.map((name) => (
            <option key={name} value={name} className="bg-surface-container text-white">
              {name}
            </option>
          ))}
          <option value="__other__" className="bg-surface-container text-primary font-bold">
            + Altro personaggio (personalizzato)...
          </option>
        </select>
      </div>

      {/* Custom Character Name if __other__ is selected */}
      {selectedCharacter === '__other__' && (
        <div>
          <label className="block font-label text-[11px] text-tertiary uppercase tracking-wider mb-1.5">
            Nome Nuovo Personaggio <span className="text-primary">*</span>
          </label>
          <input
            type="text"
            value={customCharacterName}
            onChange={(e) => setCustomCharacterName(e.target.value)}
            placeholder="es. Valerius"
            required
            maxLength={100}
            autoFocus
            className="w-full bg-surface-container-high/60 px-3.5 py-2.5 font-label text-xs text-on-surface placeholder:text-tertiary/40 rounded-xl border border-white/10 focus:border-primary/50 focus:outline-none focus:shadow-[0_0_12px_rgba(0,240,255,0.2)] transition-all"
          />
        </div>
      )}

      {/* File Drop / Selector */}
      <div>
        <label className="block font-label text-[11px] text-tertiary uppercase tracking-wider mb-1.5">
          Scheda PDF <span className="text-primary">* (max 3.2 MB)</span>
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          className="hidden"
          id="sheet-pdf-upload-input"
        />
        <label
          htmlFor="sheet-pdf-upload-input"
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            const droppedFile = e.dataTransfer?.files?.[0] ?? null
            handleFileChange(droppedFile)
          }}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border border-dashed transition-all cursor-pointer ${
            selectedFile
              ? 'bg-primary/5 border-primary/40 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
              : 'bg-surface-container-high/40 border-white/15 hover:border-primary/40 hover:bg-surface-container-high/70'
          }`}
        >
          <span
            className={`material-symbols-outlined text-2xl mb-1 ${
              selectedFile ? 'text-primary' : 'text-tertiary'
            }`}
          >
            {selectedFile ? 'picture_as_pdf' : 'upload_file'}
          </span>
          {selectedFile ? (
            <div className="text-center">
              <span className="font-label text-xs text-primary font-medium block truncate max-w-[260px]">
                {selectedFile.name}
              </span>
              <span className="font-label text-[10px] text-tertiary/80 mt-0.5 block">
                {(selectedFile.size / 1024).toFixed(1)} KB (clicca per cambiare)
              </span>
            </div>
          ) : (
            <div className="text-center">
              <span className="font-label text-xs text-tertiary/90 block">
                Seleziona o trascina il file PDF
              </span>
              <span className="font-label text-[10px] text-tertiary/50 mt-0.5 block">
                Solo PDF fino a 3.2 MB
              </span>
            </div>
          )}
        </label>
      </div>

      {/* Notes / Details */}
      <div>
        <label className="block font-label text-[11px] text-tertiary uppercase tracking-wider mb-1.5">
          Note o Modifiche (opzionale)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="es. Salito a livello 5, preso feat Weapon Focus, modificati HP"
          rows={2}
          maxLength={500}
          className="w-full bg-surface-container-high/60 px-3.5 py-2 font-label text-xs text-on-surface placeholder:text-tertiary/40 rounded-xl border border-white/10 focus:border-primary/50 focus:outline-none focus:shadow-[0_0_12px_rgba(0,240,255,0.2)] transition-all resize-none"
        />
      </div>

      {/* Passphrase */}
      <div>
        <label className="block font-label text-[11px] text-tertiary uppercase tracking-wider mb-1.5">
          Password Caricamento <span className="text-primary">*</span>
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password della campagna"
          required
          autoComplete="off"
          className="w-full bg-surface-container-high/60 px-3.5 py-2.5 font-label text-xs text-on-surface placeholder:text-tertiary/40 rounded-xl border border-white/10 focus:border-primary/50 focus:outline-none focus:shadow-[0_0_12px_rgba(0,240,255,0.2)] transition-all"
        />
        <span className="font-label text-[10px] text-tertiary/60 mt-1 block">
          Richiesta ad ogni invio per sicurezza del gruppo
        </span>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isUploading}
        className="w-full py-3 px-4 bg-primary text-black font-label font-bold text-xs uppercase tracking-wider rounded-xl hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
      >
        {isUploading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <span>Invio in corso...</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-base">send</span>
            <span>Carica Scheda e Notifica Master</span>
          </>
        )}
      </button>
    </form>
  )
}
