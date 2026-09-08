import { describe, it, expect, vi, beforeEach } from 'vitest'
import { callChatApi } from './chat-client'
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
