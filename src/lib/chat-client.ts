import type { ChatMessage } from '../store/useChatStore'
import type { FullCharacter } from '../store/useCharacterStore'
import type { SessionState } from '../types/session'

export async function callChatApi(
  messages: ChatMessage[],
  character: FullCharacter,
  session: SessionState
): Promise<string> {
  const apiMessages = messages.map((m) => ({ role: m.role, content: m.content }))

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: apiMessages, character, session }),
  })

  if (!res.ok) {
    let detail = ''
    try {
      const errBody = (await res.json()) as { error?: string; detail?: string }
      detail = errBody.detail ?? errBody.error ?? ''
    } catch { /* ignore */ }
    throw new Error(`HTTP ${res.status}${detail ? ': ' + detail : ''}`)
  }

  const data = (await res.json()) as { role: string; content: string }
  return data.content
}
