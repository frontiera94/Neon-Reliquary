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
          style={{ backdropFilter: 'blur(8px)', background: 'rgba(10,10,14,0.75)' }}
          onClick={closeChat}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="w-full h-full md:max-w-2xl md:h-[85vh] bg-surface-container flex flex-col border border-primary/20 shadow-[0_0_40px_rgba(0,218,243,0.1),0_0_80px_rgba(0,0,0,0.9)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 flex-shrink-0">
              <div>
                <h2 className="font-headline text-secondary text-sm uppercase tracking-widest neon-glow-gold">
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
                className="text-tertiary hover:text-primary transition-colors"
                aria-label="Chiudi"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && !isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-6 pb-8">
                  <div className="text-center">
                    <span
                      className="material-symbols-outlined text-5xl text-primary/40"
                      style={{ filter: 'drop-shadow(0 0 12px rgba(0,218,243,0.3))' }}
                    >
                      auto_awesome
                    </span>
                    <p className="font-label text-xs text-tertiary uppercase tracking-widest mt-3">
                      Chiedi all'oracolo
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => void sendMessage(s)}
                        className="px-3 py-2 bg-surface-container-high text-on-surface font-body text-xs hover:bg-primary/10 hover:text-primary transition-colors border border-outline-variant/20 hover:border-primary/30"
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
                        className={`max-w-[85%] px-4 py-3 font-body text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-primary/10 text-on-surface border border-primary/20 whitespace-pre-wrap'
                            : 'bg-surface-container-highest text-on-surface prose-chat'
                        }`}
                      >
                        {msg.role === 'user' ? msg.content : (
                          <Markdown
                            components={{
                              h1: ({ children }) => <p style={{ color: '#e9c349', fontFamily: 'Noto Serif, serif', fontSize: '0.95rem', marginBottom: '0.25rem' }}>{children}</p>,
                              h2: ({ children }) => <p style={{ color: '#e9c349', fontFamily: 'Noto Serif, serif', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{children}</p>,
                              h3: ({ children }) => <p style={{ color: '#e9c349', fontFamily: 'Space Grotesk, monospace', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>{children}</p>,
                              strong: ({ children }) => <strong style={{ color: '#00daf3', fontWeight: 600 }}>{children}</strong>,
                              em: ({ children }) => <em style={{ color: '#c6c6c6' }}>{children}</em>,
                              ul: ({ children }) => <ul style={{ listStyleType: 'disc', paddingLeft: '1.25rem', margin: '0.25rem 0' }}>{children}</ul>,
                              ol: ({ children }) => <ol style={{ listStyleType: 'decimal', paddingLeft: '1.25rem', margin: '0.25rem 0' }}>{children}</ol>,
                              li: ({ children }) => <li style={{ marginBottom: '0.125rem' }}>{children}</li>,
                              code: ({ children }) => <code style={{ background: '#1f1f25', padding: '0.1rem 0.3rem', fontFamily: 'Space Grotesk, monospace', fontSize: '0.75rem', color: '#00daf3' }}>{children}</code>,
                              p: ({ children }) => <p style={{ marginBottom: '0.35rem' }}>{children}</p>,
                              hr: () => <div style={{ margin: '0.5rem 0', height: '1px', background: 'rgba(63,71,83,0.3)' }} />,
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
                      <div className="px-4 py-3 bg-surface-container-highest flex items-center gap-2">
                        <div style={{
                          width: 16, height: 16, borderRadius: '50%',
                          border: '2px solid rgba(198,198,198,0.25)',
                          borderTopColor: '#c6c6c6',
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
            <div className="flex-shrink-0 border-t border-outline-variant/20 p-4 flex gap-3 items-end">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Scrivi una domanda… (Invio per inviare, Shift+Invio per andare a capo)"
                rows={2}
                disabled={isLoading || !character}
                className="flex-1 bg-surface-container-high text-on-surface font-body text-sm px-4 py-3 resize-none placeholder:text-tertiary/50 focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-40 border border-outline-variant/20 focus:border-primary/40"
              />
              <button
                onClick={() => void sendMessage(text)}
                disabled={isLoading || !text.trim() || !character}
                aria-label="Invia"
                className="flex-shrink-0 w-12 h-12 bg-primary text-on-primary flex items-center justify-center hover:shadow-[0_0_20px_rgba(0,218,243,0.4)] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
              >
                {isLoading ? (
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    border: '2px solid rgba(0,54,61,0.4)',
                    borderTopColor: '#00363d',
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
