import type { ApiRequest, ApiResponse } from './_lib/http'
import {
  setNoStoreHeaders,
  handleOptionsPreflight,
  parseJsonBody,
} from './_lib/http'

export interface ChatMessagePayload {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatRequestBody {
  messages: ChatMessagePayload[]
  character: unknown
  session: unknown
}

export interface ChatRequestOptions {
  env?: Record<string, string | undefined>
  fetchFn?: typeof fetch
}

export async function handleChatRequest(
  req: ApiRequest,
  res: ApiResponse,
  options?: ChatRequestOptions
): Promise<void> {
  setNoStoreHeaders(res)

  if (handleOptionsPreflight(req, res)) return

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const env = options?.env ?? process.env
  const apiKey = env.ANTHROPIC_API_KEY ?? env.GEMINI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'API key not configured' })
    return
  }

  const body = parseJsonBody<ChatRequestBody>(req.body)
  if (!body) {
    res.status(400).json({ error: 'Invalid JSON body' })
    return
  }

  const { messages, character, session } = body

  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    typeof character !== 'object' ||
    character === null ||
    typeof session !== 'object' ||
    session === null
  ) {
    res.status(400).json({ error: 'Invalid request body: expected messages array, character, and session objects' })
    return
  }

  const isValidMessages = messages.every(
    (m) =>
      typeof m === 'object' &&
      m !== null &&
      typeof m.role === 'string' &&
      typeof m.content === 'string'
  )
  if (!isValidMessages) {
    res.status(400).json({ error: 'Invalid message format: each message requires role and content' })
    return
  }

  const systemPrompt = `Sei un esperto di Pathfinder 1a Edizione e del personaggio descritto qui sotto. Rispondi SEMPRE in italiano. Quando citi regole, menziona il nome preciso del feat, dell'abilità di classe o della spell. Usa i dati statici del personaggio (feat, BAB, spell DC, class abilities) per sapere cosa il personaggio può fare; usa lo stato di sessione per sapere cosa è già stato speso (HP correnti, slot incantesimo, risorse giornaliere, buff attivi, condizioni).

<personaggio>
${JSON.stringify(character, null, 2)}
</personaggio>

<stato_sessione>
${JSON.stringify(session, null, 2)}
</stato_sessione>`

  const fetchImpl = options?.fetchFn ?? fetch

  try {
    const response = await fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic error:', err)
      res.status(500).json({ error: 'Errore dalla AI', detail: err })
      return
    }

    const data = (await response.json()) as { content?: { type: string; text: string }[] }
    const text = data.content?.[0]?.text ?? ''
    res.status(200).json({ role: 'assistant', content: text })
  } catch (e) {
    console.error('Chat handler error:', e)
    res.status(500).json({ error: 'Errore interno del server', detail: String(e) })
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  return handleChatRequest(req, res)
}
