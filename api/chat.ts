import type { ApiRequest, ApiResponse } from './sessions'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 1024

/** Abuse guards: this endpoint proxies a paid API with the server's key. */
export const MAX_MESSAGES = 40
export const MAX_MESSAGE_CHARS = 8_000
export const MAX_CONTEXT_CHARS = 100_000
const MAX_ERROR_DETAIL_CHARS = 500

type ChatRole = 'user' | 'assistant'

export interface ChatMessagePayload {
  role: ChatRole
  content: string
}

interface ChatRequestBody {
  messages: ChatMessagePayload[]
  character: Record<string, unknown>
  session: Record<string, unknown>
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isChatMessage(value: unknown): value is ChatMessagePayload {
  return (
    isPlainObject(value) &&
    (value.role === 'user' || value.role === 'assistant') &&
    typeof value.content === 'string' &&
    value.content.trim().length > 0 &&
    value.content.length <= MAX_MESSAGE_CHARS
  )
}

function isWithinContextLimit(value: Record<string, unknown>): boolean {
  try {
    return JSON.stringify(value).length <= MAX_CONTEXT_CHARS
  } catch {
    return false
  }
}

/**
 * Validates the raw request body. Returns the typed body, or an error string
 * suitable for a 400 response.
 */
export function parseChatBody(raw: unknown): ChatRequestBody | string {
  let body: unknown = raw
  if (typeof raw === 'string') {
    try {
      body = JSON.parse(raw)
    } catch {
      return 'Invalid JSON body'
    }
  }

  if (!isPlainObject(body)) return 'Invalid request body'

  const { messages, character, session } = body
  if (!isPlainObject(character) || !isPlainObject(session)) {
    return 'Invalid request body: character and session must be objects'
  }
  if (!isWithinContextLimit(character) || !isWithinContextLimit(session)) {
    return `Invalid request body: character and session must each serialize to at most ${MAX_CONTEXT_CHARS} characters`
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return 'Invalid request body: messages must be a non-empty array'
  }
  if (messages.length > MAX_MESSAGES) {
    return `Too many messages (max ${MAX_MESSAGES})`
  }
  if (!messages.every(isChatMessage)) {
    return `Invalid message: role must be "user" or "assistant" and content a non-empty string of at most ${MAX_MESSAGE_CHARS} characters`
  }
  if (messages[messages.length - 1].role !== 'user') {
    return 'Invalid request body: last message must come from the user'
  }

  // Strip any extra fields so arbitrary client data is never forwarded upstream.
  return {
    messages: messages.map(({ role, content }) => ({ role, content })),
    character,
    session,
  }
}

export function buildSystemPrompt(character: unknown, session: unknown): string {
  return `Sei un esperto di Pathfinder 1a Edizione e del personaggio descritto qui sotto. Rispondi SEMPRE in italiano. Quando citi regole, menziona il nome preciso del feat, dell'abilità di classe o della spell. Usa i dati statici del personaggio (feat, BAB, spell DC, class abilities) per sapere cosa il personaggio può fare; usa lo stato di sessione per sapere cosa è già stato speso (HP correnti, slot incantesimo, risorse giornaliere, buff attivi, condizioni).

<personaggio>
${JSON.stringify(character, null, 2)}
</personaggio>

<stato_sessione>
${JSON.stringify(session, null, 2)}
</stato_sessione>`
}

/** Concatenates every text block of an Anthropic Messages API response. */
export function extractText(data: unknown): string {
  if (!isPlainObject(data) || !Array.isArray(data.content)) return ''
  return data.content
    .filter(
      (block): block is { type: 'text'; text: string } =>
        isPlainObject(block) && block.type === 'text' && typeof block.text === 'string'
    )
    .map((block) => block.text)
    .join('')
}

export async function handleChatRequest(
  req: ApiRequest,
  res: ApiResponse,
  options?: {
    apiKey?: string
    fetchImpl?: typeof fetch
  }
): Promise<void> {
  res.setHeader?.('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = options?.apiKey ?? process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'API key not configured' })
    return
  }

  // Vercel may pass the body as a raw string depending on runtime version.
  const parsed = parseChatBody(req.body)
  if (typeof parsed === 'string') {
    res.status(400).json({ error: parsed })
    return
  }

  const fetchFn = options?.fetchImpl ?? fetch

  try {
    const response = await fetchFn(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: buildSystemPrompt(parsed.character, parsed.session),
        messages: parsed.messages,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic error:', response.status, err)
      res.status(502).json({
        error: 'Errore dalla AI',
        detail: `Upstream HTTP ${response.status}: ${err.slice(0, MAX_ERROR_DETAIL_CHARS)}`,
      })
      return
    }

    const text = extractText(await response.json())
    res.status(200).json({ role: 'assistant', content: text })
  } catch (e) {
    console.error('Chat handler error:', e)
    res.status(500).json({ error: 'Errore interno del server' })
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  return handleChatRequest(req, res)
}
