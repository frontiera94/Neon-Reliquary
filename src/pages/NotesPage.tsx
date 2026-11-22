import { useEffect, useMemo, useRef, useState } from 'react'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import type { CharacterNote } from '../types/session'
import { useTranslation } from '../i18n'

const EMPTY_NOTES: CharacterNote[] = []

function formatTimestamp(ts: number, locale: 'en' | 'it'): string {
  try {
    return new Intl.DateTimeFormat(locale === 'it' ? 'it-IT' : 'en-US', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts))
  } catch {
    return ''
  }
}

export function NotesPage() {
  const char = useCharacterStore((s) => s.activeCharacter())
  const charId = char?.id ?? ''

  const rawNotes = useSessionStore((s) => (charId ? s.sessions[charId]?.notes ?? EMPTY_NOTES : EMPTY_NOTES))
  const addNote = useSessionStore((s) => s.addNote)
  const updateNote = useSessionStore((s) => s.updateNote)
  const togglePinNote = useSessionStore((s) => s.togglePinNote)
  const deleteNote = useSessionStore((s) => s.deleteNote)

  const { locale, t } = useTranslation()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const titleInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setSelectedNoteId(null)
    setMobileEditorOpen(false)
    setPendingDeleteId(null)
    setSearchQuery('')
  }, [charId])

  const sortedNotes = useMemo(() => {
    return [...rawNotes].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt
      return b.createdAt - a.createdAt
    })
  }, [rawNotes])

  const query = searchQuery.trim().toLowerCase()
  const filteredNotes = useMemo(() => {
    if (!query) return sortedNotes
    return sortedNotes.filter(
      (n) => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)
    )
  }, [sortedNotes, query])

  const effectiveSelectedId = useMemo(() => {
    if (selectedNoteId && rawNotes.some((n) => n.id === selectedNoteId)) {
      return selectedNoteId
    }
    return sortedNotes[0]?.id ?? null
  }, [selectedNoteId, rawNotes, sortedNotes])

  const activeNote = useMemo(
    () => rawNotes.find((n) => n.id === effectiveSelectedId) ?? null,
    [rawNotes, effectiveSelectedId]
  )

  const pendingDeleteNote = useMemo(
    () => (pendingDeleteId ? rawNotes.find((n) => n.id === pendingDeleteId) ?? null : null),
    [rawNotes, pendingDeleteId]
  )

  useEffect(() => {
    if (!pendingDeleteNote) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPendingDeleteId(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pendingDeleteNote])

  if (!char) {
    return (
      <div className="flex items-center justify-center h-64 text-tertiary font-label text-sm uppercase tracking-widest">
        {t('common.noCharacterSelected')}
      </div>
    )
  }

  const handleCreateNote = () => {
    const newId = addNote(char.id)
    setSelectedNoteId(newId)
    setMobileEditorOpen(true)
    setSearchQuery('')
    requestAnimationFrame(() => {
      titleInputRef.current?.focus()
    })
  }

  const handleSelectNote = (noteId: string) => {
    setSelectedNoteId(noteId)
    setMobileEditorOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!pendingDeleteNote) return
    const targetId = pendingDeleteNote.id
    deleteNote(char.id, targetId)
    setPendingDeleteId(null)
    if (selectedNoteId === targetId || effectiveSelectedId === targetId) {
      setSelectedNoteId(null)
      setMobileEditorOpen(false)
    }
  }

  const wordCount = activeNote
    ? activeNote.content.trim()
      ? activeNote.content.trim().split(/\s+/).length
      : 0
    : 0
  const charCount = activeNote ? activeNote.content.length : 0

  const noteCountLabel =
    rawNotes.length === 1
      ? t('notes.noteCountSingular')
      : t('notes.noteCount', { count: rawNotes.length })

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
            {locale === 'it' ? (
              <>
                Blocco <span className="text-primary neon-glow-primary">Note</span>
              </>
            ) : (
              <>
                Character <span className="text-primary neon-glow-primary">Notes</span>
              </>
            )}
          </h1>
          <p className="font-label text-xs sm:text-sm text-tertiary tracking-wide mt-0.5">
            {t('notes.subtitle', { name: char.name })} ·{' '}
            <span className="text-white/70">{noteCountLabel}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateNote}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/40 text-primary font-label text-xs uppercase tracking-wider font-bold transition-all shadow-[0_0_15px_rgba(0,240,255,0.15)] cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span>{t('notes.newNote')}</span>
        </button>
      </div>

      {/* Split View Container */}
      <div className="flex flex-col md:flex-row gap-4 md:min-h-[540px]">
        {/* Left Pane: Search + Notes List */}
        <section
          aria-label={t('notes.pageTitle')}
          className={`${
            mobileEditorOpen ? 'hidden md:flex' : 'flex'
          } flex-col w-full md:w-80 lg:w-96 flex-shrink-0 bg-surface-container/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden`}
        >
          {/* Search Bar */}
          <div className="p-3 border-b border-white/10">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-base select-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('notes.searchPlaceholder')}
                aria-label={t('notes.searchPlaceholder')}
                className="w-full bg-surface/60 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder-tertiary focus:outline-none focus:border-primary/50 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={t('common.clear')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-white cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[65vh] md:max-h-[520px]">
            {rawNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center px-4 py-12 space-y-3">
                <span className="material-symbols-outlined text-4xl text-tertiary/50">edit_note</span>
                <div className="space-y-1">
                  <p className="font-headline text-sm font-bold text-white/80">
                    {t('notes.emptyListTitle')}
                  </p>
                  <p className="text-xs text-tertiary leading-relaxed">{t('notes.emptyListHint')}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateNote}
                  className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary font-label text-[11px] uppercase tracking-wider font-bold transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>{t('notes.createFirst')}</span>
                </button>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="text-center px-4 py-10 text-xs text-tertiary">
                {t('notes.emptySearch')}
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = note.id === effectiveSelectedId
                const displayTitle = note.title.trim() || t('notes.untitled')
                const preview = note.content.trim().replace(/\s+/g, ' ')
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => handleSelectNote(note.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 border-primary/40 shadow-[0_0_12px_rgba(0,240,255,0.12)]'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`font-headline text-sm font-bold truncate ${
                          note.title.trim() ? 'text-white' : 'text-tertiary italic'
                        }`}
                      >
                        {displayTitle}
                      </span>
                      {note.pinned && (
                        <span
                          className="material-symbols-outlined text-sm text-secondary flex-shrink-0"
                          title={t('notes.pinned')}
                        >
                          push_pin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-tertiary mt-1 line-clamp-2 min-h-[1rem]">
                      {preview || '—'}
                    </p>
                    <div className="flex items-center justify-between mt-2 text-[10px] font-label uppercase tracking-wider text-tertiary/70">
                      <span>{formatTimestamp(note.updatedAt, locale)}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </section>

        {/* Right Pane: Note Editor */}
        <section
          aria-label={activeNote ? activeNote.title || t('notes.untitled') : t('notes.selectPrompt')}
          className={`${
            mobileEditorOpen ? 'flex' : 'hidden md:flex'
          } flex-col flex-1 bg-surface-container/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden min-h-[420px]`}
        >
          {activeNote ? (
            <>
              {/* Editor Toolbar */}
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileEditorOpen(false)}
                    className="md:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-label uppercase tracking-wider text-white cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    <span>{t('common.back')}</span>
                  </button>

                  <span className="inline-flex items-center gap-1.5 text-[11px] font-label uppercase tracking-wider text-tertiary truncate">
                    <span className="material-symbols-outlined text-sm text-primary/80">
                      cloud_done
                    </span>
                    <span className="hidden sm:inline">{t('notes.autoSaved')} ·</span>
                    <span>{formatTimestamp(activeNote.updatedAt, locale)}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => togglePinNote(char.id, activeNote.id)}
                    aria-pressed={activeNote.pinned}
                    aria-label={activeNote.pinned ? t('notes.unpin') : t('notes.pin')}
                    title={activeNote.pinned ? t('notes.unpin') : t('notes.pin')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-label uppercase tracking-wider transition-colors cursor-pointer ${
                      activeNote.pinned
                        ? 'bg-secondary/15 border-secondary/40 text-secondary'
                        : 'bg-white/5 border-white/10 text-tertiary hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">push_pin</span>
                    <span className="hidden sm:inline">
                      {activeNote.pinned ? t('notes.pinned') : t('notes.pin')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(activeNote.id)}
                    aria-label={t('notes.deleteNote')}
                    title={t('notes.deleteNote')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-label uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                    <span className="hidden sm:inline">{t('common.delete')}</span>
                  </button>
                </div>
              </div>

              {/* Editor Inputs */}
              <div className="flex-1 flex flex-col p-4 sm:p-6 gap-3">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => updateNote(char.id, activeNote.id, { title: e.target.value })}
                  placeholder={t('notes.titlePlaceholder')}
                  aria-label={t('notes.titlePlaceholder')}
                  className="w-full bg-transparent border-b border-white/10 pb-3 font-headline text-xl sm:text-2xl font-bold text-white placeholder-tertiary/60 focus:outline-none focus:border-primary/60 transition-colors"
                />

                <textarea
                  value={activeNote.content}
                  onChange={(e) => updateNote(char.id, activeNote.id, { content: e.target.value })}
                  placeholder={t('notes.contentPlaceholder')}
                  aria-label={t('notes.contentPlaceholder')}
                  className="flex-1 w-full min-h-[300px] bg-transparent text-sm sm:text-base text-white/90 placeholder-tertiary/50 leading-relaxed resize-none focus:outline-none"
                />
              </div>

              {/* Editor Footer */}
              <div className="px-4 sm:px-6 py-2.5 border-t border-white/5 flex items-center justify-between text-[11px] font-label uppercase tracking-wider text-tertiary/70">
                <span>{t('notes.wordCount', { count: wordCount })}</span>
                <span>{t('notes.charCount', { count: charCount })}</span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <span className="material-symbols-outlined text-5xl text-tertiary/40">edit_note</span>
              <p className="text-sm text-tertiary">{t('notes.selectPrompt')}</p>
              <button
                type="button"
                onClick={handleCreateNote}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/40 text-primary font-label text-xs uppercase tracking-wider font-bold transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span>{t('notes.newNote')}</span>
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {pendingDeleteNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setPendingDeleteId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-note-dialog-title"
            className="w-full max-w-sm bg-surface-container border border-white/15 rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                <span className="material-symbols-outlined text-xl">delete_forever</span>
              </div>
              <h2
                id="delete-note-dialog-title"
                className="font-headline text-lg font-bold text-white"
              >
                {t('notes.deleteConfirmTitle')}
              </h2>
            </div>

            <p className="text-sm text-tertiary leading-relaxed">
              {t('notes.deleteConfirmMessage', {
                title: pendingDeleteNote.title.trim() || t('notes.untitled'),
              })}
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-label uppercase tracking-wider text-white transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-xs font-label uppercase tracking-wider font-bold text-red-300 transition-colors cursor-pointer"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
