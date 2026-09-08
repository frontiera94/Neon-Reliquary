import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Markdown from 'react-markdown'
import { useChatStore } from '../../store/useChatStore'
import { useCharacterStore } from '../../store/useCharacterStore'
import { useSessionStore } from '../../store/useSessionStore'
import { callChatApi } from '../../lib/chat-client'
import type { ChatMessage } from '../../store/useChatStore'

const SUGGESTIONS = [
  'Quali feat ho e cosa fanno?',
  'Come funziona Power Attack con questa build?',
  'Quante risorse giornaliere mi restano?',
  'Che incantesimi posso ancora lanciare?',
]

export function ChatModal() {
  const isOpen = useChatStore((s) => s.isOpen)
  const isLoading = useChatStore((s) => s.isLoading)
  const closeChat = useChatStore((s) => s.closeChat)
  const appendMessage = useChatStore((s) => s.appendMessage)
  const setLoading = useChatStore((s) => s.setLoading)
  const chats = useChatStore((s) => s.chats)

  const character = useCharacterStore((s) => s.activeCharacter())
  const getSession = useSessionStore((s) => s.getSession)

  const characterId = character?.id ?? ''
  const messages = chats[characterId] ?? []

  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeChat()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeChat])

  const sendMessage = async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || isLoading || !character) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      ts: Date.now(),
    }
    appendMessage(characterId, userMsg)
    setText('')
    setLoading(true)

    const session = getSession(characterId)
    const allMessages = [...messages, userMsg]

    try {
      const response = await callChatApi(allMessages, character, session)
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        ts: Date.now(),
      }
      appendMessage(characterId, assistantMsg)
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Errore: impossibile contattare l'oracolo.\n${detail}`,
        ts: Date.now(),
      }
      appendMessage(characterId, errMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage(text)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex flex-col md:items-center md:justify-center p-0 md:p-6"
          style={{ backdropFilter: 'blur(16px)', background: 'rgba(10,10,18,0.85)' }}
          onClick={closeChat}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="w-full h-full md:max-w-2xl md:h-[85vh] bg-surface-container/95 backdrop-blur-xl flex flex-col border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.12),0_0_80px_rgba(0,0,0,0.9)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0 bg-surface-container-high/50">
              <div>
                <h2 className="font-headline text-secondary text-sm uppercase tracking-widest neon-glow-accent font-bold">
                  Oracolo
                </h2>
                {character && (
                  <p className="font-label text-[10px] text-tertiary uppercase tracking-widest mt-0.5">
                    {character.name} — {character.class} {character.level}
                  </p>
                )}
              </div>
              <button
                onClick={closeChat}
                className="text-tertiary hover:text-primary transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer"
                aria-label="Chiudi"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <span className="material-symbols-outlined text-4xl text-primary/40 mb-3">
                    psychology
                  </span>
                  <p className="font-headline text-on-surface text-base mb-1">
                    Interroga l'Oracolo
                  </p>
                  <p className="font-body text-xs text-tertiary max-w-sm mb-6">
                    Chiedi regole, chiarimenti sulle abilità, incantesimi o lo stato della tua scheda Pathfinder 1e.
                  </p>
                  <div className="flex flex-col gap-2 w-full max-w-sm">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => void sendMessage(s)}
                        disabled={!character}
                        className="text-left font-label text-xs px-3.5 py-2.5 bg-surface-container-high border border-white/10 rounded-xl hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all text-on-surface-variant cursor-pointer"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-3 font-body text-sm leading-relaxed rounded-2xl ${
                          msg.role === 'user'
                            ? 'bg-primary/15 text-white border border-primary/30 whitespace-pre-wrap rounded-br-none shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                            : 'bg-surface-container-highest border border-white/10 text-on-surface rounded-bl-none prose-chat'
                        }`}
                      >
                        {msg.role === 'user' ? msg.content : (
                          <Markdown
                            components={{
                              h1: ({ children }) => <p style={{ color: '#d946ef', fontFamily: 'Noto Serif, serif', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.25rem' }}>{children}</p>,
                              h2: ({ children }) => <p style={{ color: '#d946ef', fontFamily: 'Noto Serif, serif', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>{children}</p>,
                              h3: ({ children }) => <p style={{ color: '#00f0ff', fontFamily: 'Space Grotesk, monospace', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>{children}</p>,
                              strong: ({ children }) => <strong style={{ color: '#00f0ff', fontWeight: 600 }}>{children}</strong>,
                              em: ({ children }) => <em style={{ color: '#cbd5e1' }}>{children}</em>,
                              ul: ({ children }) => <ul style={{ listStyleType: 'disc', paddingLeft: '1.25rem', margin: '0.25rem 0' }}>{children}</ul>,
                              ol: ({ children }) => <ol style={{ listStyleType: 'decimal', paddingLeft: '1.25rem', margin: '0.25rem 0' }}>{children}</ol>,
                              li: ({ children }) => <li style={{ marginBottom: '0.125rem' }}>{children}</li>,
                              code: ({ children }) => <code style={{ background: '#0a0a12', padding: '0.1rem 0.35rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'Space Grotesk, monospace', fontSize: '0.75rem', color: '#00f0ff' }}>{children}</code>,
                              p: ({ children }) => <p style={{ marginBottom: '0.35rem' }}>{children}</p>,
                              hr: () => <div style={{ margin: '0.5rem 0', height: '1px', background: 'rgba(255,255,255,0.1)' }} />,
                            }}
                          >
                            {msg.content}
                          </Markdown>
                        )}
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="px-4 py-3 bg-surface-container-highest border border-white/10 rounded-2xl rounded-bl-none flex items-center gap-2">
                        <div style={{
                          width: 14, height: 14, borderRadius: '50%',
                          border: '2px solid rgba(0,240,255,0.3)',
                          borderTopColor: '#00f0ff',
                          animation: 'chat-spin 0.8s linear infinite',
                          flexShrink: 0,
                        }} />
                        <span className="font-label text-[10px] text-tertiary uppercase tracking-widest">
                          In elaborazione…
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 border-t border-white/10 p-4 flex gap-3 items-end bg-surface-container-high/30">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Scrivi una domanda… (Invio per inviare, Shift+Invio per andare a capo)"
                rows={2}
                disabled={isLoading || !character}
                className="flex-1 bg-surface-container-high text-on-surface font-body text-sm px-4 py-3 resize-none rounded-xl placeholder:text-tertiary/60 focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-40 border border-white/10 focus:border-primary/50"
              />
              <button
                onClick={() => void sendMessage(text)}
                disabled={isLoading || !text.trim() || !character}
                aria-label="Invia"
                className="flex-shrink-0 w-12 h-12 bg-primary text-black rounded-xl font-bold flex items-center justify-center hover:shadow-[0_0_20px_rgba(0,240,255,0.45)] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none cursor-pointer"
              >
                {isLoading ? (
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    border: '2px solid rgba(0,0,0,0.3)',
                    borderTopColor: '#000000',
                    animation: 'chat-spin 0.8s linear infinite',
                  }} />
                ) : (
                  <span className="material-symbols-outlined text-xl">send</span>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
