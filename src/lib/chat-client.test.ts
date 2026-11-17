import { describe, it, expect, vi, beforeEach } from 'vitest'
import { callChatApi } from './chat-client'
import {
  parseChatBody,
  buildSystemPrompt,
  extractText,
  handleChatRequest,
  MAX_MESSAGES,
  MAX_MESSAGE_CHARS,
  MAX_CONTEXT_CHARS,
} from '../../api/chat'
import type { ApiRequest, ApiResponse } from '../../api/sessions'
import type { ChatMessage } from '../store/useChatStore'
import type { FullCharacter } from '../store/useCharacterStore'
import type { SessionState } from '../types/session'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function okResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  })
}

function errorResponse(status: number, body: unknown = {}) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  })
}

const fakeChar = { id: 'char-1', name: 'Valerius' } as FullCharacter
const fakeSession = { characterId: 'char-1', currentHp: 20 } as SessionState

describe('callChatApi', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('sends transformed messages, character, and session in POST body', async () => {
    mockFetch.mockReturnValue(
      okResponse({ role: 'assistant', content: 'May the light guide you.' })
    )

    const messages: ChatMessage[] = [
      { id: 'm1', role: 'user', content: 'What are my prepared spells?', ts: 123456 },
    ]

    const result = await callChatApi(messages, fakeChar, fakeSession)

    expect(result).toBe('May the light guide you.')
    expect(mockFetch).toHaveBeenCalledOnce()

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    const expectedEndpoint = import.meta.env.VITE_CHAT_ENDPOINT ?? '/api/chat'
    expect(url).toBe(expectedEndpoint)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })

    const parsedBody = JSON.parse(init.body as string)
    expect(parsedBody.messages).toEqual([{ role: 'user', content: 'What are my prepared spells?' }])
    expect(parsedBody.character).toEqual(fakeChar)
    expect(parsedBody.session).toEqual(fakeSession)
  })

  it('throws descriptive error on server error with detail', async () => {
    mockFetch.mockReturnValue(
      errorResponse(500, { detail: 'AI model service unavailable' })
    )

    await expect(callChatApi([], fakeChar, fakeSession)).rejects.toThrow(
      'HTTP 500: AI model service unavailable'
    )
  })

  it('throws error with error field when detail is missing', async () => {
    mockFetch.mockReturnValue(
      errorResponse(400, { error: 'Bad Request Payload' })
    )

    await expect(callChatApi([], fakeChar, fakeSession)).rejects.toThrow(
      'HTTP 400: Bad Request Payload'
    )
  })

  it('throws error with status only when response body is not JSON', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })
    )

    await expect(callChatApi([], fakeChar, fakeSession)).rejects.toThrow('HTTP 502')
  })
})

// ─── api/chat handler & validators ───────────────────────────────────────────

function createMockRes() {
  const headers: Record<string, string> = {}
  let statusCode = 200
  let jsonBody: unknown = undefined

  const res: ApiResponse = {
    setHeader(name: string, value: string) {
      headers[name] = value
    },
    status(code: number) {
      statusCode = code
      return {
        json(body: unknown) {
          jsonBody = body
        },
      }
    },
  }

  return {
    res,
    getStatus: () => statusCode,
    getBody: () => jsonBody as Record<string, unknown>,
    getHeaders: () => headers,
  }
}

describe('api/chat validators & handler', () => {
  it('parseChatBody rejects invalid JSON string, non-object body, missing character/session, and empty messages', () => {
    expect(parseChatBody('{not-valid-json')).toBe('Invalid JSON body')
    expect(parseChatBody(null)).toBe('Invalid request body')
    expect(parseChatBody([])).toBe('Invalid request body')
    expect(parseChatBody({ messages: [] })).toBe(
      'Invalid request body: character and session must be objects'
    )
    expect(parseChatBody({ messages: [], character: {}, session: {} })).toBe(
      'Invalid request body: messages must be a non-empty array'
    )
    expect(
      parseChatBody({
        messages: [{ role: 'user', content: 'hi' }],
        character: { bio: 'x'.repeat(MAX_CONTEXT_CHARS + 1) },
        session: {},
      })
    ).toBe(
      `Invalid request body: character and session must each serialize to at most ${MAX_CONTEXT_CHARS} characters`
    )
  })

  it('parseChatBody rejects invalid roles, empty content, oversized messages, and non-user last message', () => {
    const expectedMsgErr = `Invalid message: role must be "user" or "assistant" and content a non-empty string of at most ${MAX_MESSAGE_CHARS} characters`

    expect(
      parseChatBody({
        messages: [{ role: 'system', content: 'hi' }],
        character: {},
        session: {},
      })
    ).toBe(expectedMsgErr)

    expect(
      parseChatBody({
        messages: [{ role: 'user', content: '   ' }],
        character: {},
        session: {},
      })
    ).toBe(expectedMsgErr)

    expect(
      parseChatBody({
        messages: [{ role: 'user', content: 'x'.repeat(MAX_MESSAGE_CHARS + 1) }],
        character: {},
        session: {},
      })
    ).toBe(expectedMsgErr)

    const tooMany = Array.from({ length: MAX_MESSAGES + 1 }, () => ({
      role: 'user',
      content: 'ping',
    }))
    expect(parseChatBody({ messages: tooMany, character: {}, session: {} })).toBe(
      `Too many messages (max ${MAX_MESSAGES})`
    )

    expect(
      parseChatBody({
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
        ],
        character: {},
        session: {},
      })
    ).toBe('Invalid request body: last message must come from the user')
  })

  it('parseChatBody strips unexpected fields from messages and parses JSON string payload', () => {
    const res = parseChatBody(
      JSON.stringify({
        messages: [{ role: 'user', content: 'Roll perception', id: 'm1', ts: 999 }],
        character: { id: 'c1' },
        session: { currentHp: 20 },
      })
    )
    expect(res).toEqual({
      messages: [{ role: 'user', content: 'Roll perception' }],
      character: { id: 'c1' },
      session: { currentHp: 20 },
    })
  })

  it('buildSystemPrompt includes serialized character and session JSON', () => {
    const prompt = buildSystemPrompt({ name: 'Aldric' }, { currentHp: 42 })
    expect(prompt).toContain('"name": "Aldric"')
    expect(prompt).toContain('"currentHp": 42')
  })

  it('extractText concatenates multiple text content blocks and ignores non-text blocks', () => {
    expect(
      extractText({
        content: [
          { type: 'thinking', text: 'ignored' },
          { type: 'text', text: 'First paragraph. ' },
          { type: 'text', text: 'Second paragraph.' },
        ],
      })
    ).toBe('First paragraph. Second paragraph.')
    expect(extractText({})).toBe('')
  })

  it('handleChatRequest returns 405 for non-POST requests', async () => {
    const { res, getStatus, getBody, getHeaders } = createMockRes()
    await handleChatRequest({ method: 'GET' }, res, { apiKey: 'test-key' })
    expect(getStatus()).toBe(405)
    expect(getHeaders()['Cache-Control']).toBe('no-store')
    expect(getBody()).toEqual({ error: 'Method not allowed' })
  })

  it('handleChatRequest returns 500 when ANTHROPIC_API_KEY is missing', async () => {
    const { res, getStatus, getBody } = createMockRes()
    await handleChatRequest(
      {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Hi' }],
          character: {},
          session: {},
        },
      },
      res,
      { apiKey: '' }
    )
    expect(getStatus()).toBe(500)
    expect(getBody()).toEqual({ error: 'API key not configured' })
  })

  it('handleChatRequest returns 400 on invalid payload', async () => {
    const { res, getStatus, getBody } = createMockRes()
    await handleChatRequest(
      { method: 'POST', body: { messages: [], character: {}, session: {} } },
      res,
      { apiKey: 'test-key' }
    )
    expect(getStatus()).toBe(400)
    expect(getBody()).toEqual({ error: 'Invalid request body: messages must be a non-empty array' })
  })

  it('handleChatRequest forwards valid request to Anthropic and returns assistant text', async () => {
    const fakeAnthropicFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          content: [{ type: 'text', text: 'Your AC is 19.' }],
        }),
    })
    const { res, getStatus, getBody, getHeaders } = createMockRes()
    const req: ApiRequest = {
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: 'What is my AC?' }],
        character: { name: 'Valerius' },
        session: { currentHp: 20 },
      },
    }

    await handleChatRequest(req, res, {
      apiKey: 'sk-ant-test',
      fetchImpl: fakeAnthropicFetch as unknown as typeof fetch,
    })

    expect(getStatus()).toBe(200)
    expect(getHeaders()['Cache-Control']).toBe('no-store')
    expect(getBody()).toEqual({ role: 'assistant', content: 'Your AC is 19.' })
    expect(fakeAnthropicFetch).toHaveBeenCalledOnce()
  })

  it('handleChatRequest returns 502 with truncated upstream error detail when Anthropic fails', async () => {
    const fakeAnthropicFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 529,
      text: () => Promise.resolve('Overloaded '.repeat(60)),
    })
    const { res, getStatus, getBody } = createMockRes()

    await handleChatRequest(
      {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Hi' }],
          character: {},
          session: {},
        },
      },
      res,
      { apiKey: 'sk-ant-test', fetchImpl: fakeAnthropicFetch as unknown as typeof fetch }
    )

    expect(getStatus()).toBe(502)
    expect(getBody().error).toBe('Errore dalla AI')
    expect((getBody().detail as string).startsWith('Upstream HTTP 529:')).toBe(true)
    expect((getBody().detail as string).length).toBeLessThanOrEqual(525)
  })

  it('handleChatRequest returns 500 when fetch throws a network error', async () => {
    const fakeAnthropicFetch = vi.fn().mockRejectedValue(new Error('ECONNRESET'))
    const { res, getStatus, getBody } = createMockRes()

    await handleChatRequest(
      {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Hi' }],
          character: {},
          session: {},
        },
      },
      res,
      { apiKey: 'sk-ant-test', fetchImpl: fakeAnthropicFetch as unknown as typeof fetch }
    )

    expect(getStatus()).toBe(500)
    expect(getBody()).toEqual({ error: 'Errore interno del server' })
  })
})
