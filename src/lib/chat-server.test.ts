import { describe, it, expect, vi } from 'vitest'
import { handleChatRequest } from '../../api/chat'
import type { ApiResponse } from '../../api/_lib/http'

function createMockRes() {
  let statusCode = 200
  let jsonBody: unknown = undefined
  const headers: Record<string, string> = {}
  let ended = false

  const res: ApiResponse = {
    setHeader: (name, value) => {
      headers[name] = value
    },
    status: (code) => {
      statusCode = code
      return {
        json: (payload) => {
          jsonBody = payload
        },
        end: () => {
          ended = true
        },
      }
    },
  }

  return {
    res,
    getStatus: () => statusCode,
    getJson: () => jsonBody,
    getHeaders: () => headers,
    isEnded: () => ended,
  }
}

describe('api/chat handleChatRequest', () => {
  it('sets Cache-Control: no-store and handles OPTIONS preflight', async () => {
    const mock = createMockRes()
    await handleChatRequest({ method: 'OPTIONS' }, mock.res)
    expect(mock.getHeaders()['Cache-Control']).toBe('no-store')
    expect(mock.getHeaders()['Access-Control-Allow-Origin']).toBe('*')
    expect(mock.getHeaders()['Access-Control-Allow-Methods']).toContain('POST')
    expect(mock.getStatus()).toBe(204)
    expect(mock.isEnded()).toBe(true)
  })

  it('rejects non-POST methods with 405 Method Not Allowed', async () => {
    const mock = createMockRes()
    await handleChatRequest({ method: 'GET' }, mock.res)
    expect(mock.getStatus()).toBe(405)
    expect(mock.getJson()).toEqual({ error: 'Method not allowed' })
  })

  it('returns 500 if API key is not configured', async () => {
    const mock = createMockRes()
    await handleChatRequest(
      { method: 'POST', body: { messages: [{ role: 'user', content: 'hi' }], character: {}, session: {} } },
      mock.res,
      { env: {} }
    )
    expect(mock.getStatus()).toBe(500)
    expect(mock.getJson()).toEqual({ error: 'API key not configured' })
  })

  it('rejects invalid JSON body with 400', async () => {
    const mock = createMockRes()
    await handleChatRequest(
      { method: 'POST', body: 'not-json{' },
      mock.res,
      { env: { ANTHROPIC_API_KEY: 'test-key' } }
    )
    expect(mock.getStatus()).toBe(400)
    expect(mock.getJson()).toEqual({ error: 'Invalid JSON body' })
  })

  it('rejects missing or empty messages with 400', async () => {
    const mock = createMockRes()
    await handleChatRequest(
      { method: 'POST', body: { messages: [], character: {}, session: {} } },
      mock.res,
      { env: { ANTHROPIC_API_KEY: 'test-key' } }
    )
    expect(mock.getStatus()).toBe(400)
  })

  it('rejects invalid message elements with 400', async () => {
    const mock = createMockRes()
    await handleChatRequest(
      { method: 'POST', body: { messages: [{ role: 'user', content: 123 }], character: {}, session: {} } },
      mock.res,
      { env: { ANTHROPIC_API_KEY: 'test-key' } }
    )
    expect(mock.getStatus()).toBe(400)
    expect(mock.getJson()).toEqual({ error: 'Invalid message format: each message requires role and content' })
  })

  it('rejects non-object character or session with 400', async () => {
    const mock = createMockRes()
    await handleChatRequest(
      { method: 'POST', body: { messages: [{ role: 'user', content: 'hi' }], character: 'bad-char', session: {} } },
      mock.res,
      { env: { ANTHROPIC_API_KEY: 'test-key' } }
    )
    expect(mock.getStatus()).toBe(400)
    expect(mock.getJson()).toEqual({
      error: 'Invalid request body: expected messages array, character, and session objects',
    })
  })

  it('forwards prompt to Anthropic and returns assistant message on 200', async () => {
    const mock = createMockRes()
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        content: [{ type: 'text', text: 'You can cast Shocking Grasp as a standard action.' }],
      }),
    })

    await handleChatRequest(
      {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'What can I cast?' }],
          character: { name: 'Shotrix' },
          session: { currentHp: 20 },
        },
      },
      mock.res,
      {
        env: { ANTHROPIC_API_KEY: 'test-key' },
        fetchFn: mockFetch as unknown as typeof fetch,
      }
    )

    expect(mock.getStatus()).toBe(200)
    expect(mock.getJson()).toEqual({
      role: 'assistant',
      content: 'You can cast Shocking Grasp as a standard action.',
    })

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect(init.headers['x-api-key']).toBe('test-key')
  })

  it('returns 500 with detail if AI provider returns an error response', async () => {
    const mock = createMockRes()
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    })

    await handleChatRequest(
      {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Hello' }],
          character: { name: 'Shotrix' },
          session: {},
        },
      },
      mock.res,
      {
        env: { ANTHROPIC_API_KEY: 'test-key' },
        fetchFn: mockFetch as unknown as typeof fetch,
      }
    )

    expect(mock.getStatus()).toBe(500)
    expect(mock.getJson()).toEqual({
      error: 'Errore dalla AI',
      detail: 'Rate limit exceeded',
    })
  })
})
