import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '../../api/chat'

function createMockReqRes(options: {
  method?: string
  body?: unknown
}) {
  const req = {
    method: options.method ?? 'POST',
    body: options.body,
  }

  let statusCode = 200
  let jsonBody: Record<string, unknown> = {}

  const res = {
    status: (code: number) => {
      statusCode = code
      return res
    },
    json: (data: Record<string, unknown>) => {
      jsonBody = data
      return res
    },
  }

  return {
    req,
    res,
    getStatus: () => statusCode,
    getJson: () => jsonBody,
  }
}

describe('api/chat serverless handler', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-api-key'
    vi.restoreAllMocks()
  })

  it('rejects non-POST methods with 405', async () => {
    const { req, res, getStatus } = createMockReqRes({ method: 'GET' })
    await handler(req, res)
    expect(getStatus()).toBe(405)
  })

  it('rejects empty or missing request body with 400', async () => {
    const { req, res, getStatus } = createMockReqRes({ body: {} })
    await handler(req, res)
    expect(getStatus()).toBe(400)
  })

  it('rejects messages array with 0 items', async () => {
    const { req, res, getStatus, getJson } = createMockReqRes({
      body: {
        messages: [],
        character: { name: 'Knam' },
        session: { currentHp: 40 },
      },
    })
    await handler(req, res)
    expect(getStatus()).toBe(400)
    expect(getJson().error).toContain('Invalid message count')
  })

  it('rejects messages array with more than 20 items', async () => {
    const messages = Array.from({ length: 21 }, (_, i) => ({
      role: 'user',
      content: `Message ${i}`,
    }))
    const { req, res, getStatus, getJson } = createMockReqRes({
      body: {
        messages,
        character: { name: 'Knam' },
        session: { currentHp: 40 },
      },
    })
    await handler(req, res)
    expect(getStatus()).toBe(400)
    expect(getJson().error).toContain('Invalid message count')
  })

  it('rejects messages with invalid roles or oversized content (>2000 chars)', async () => {
    const { req, res, getStatus, getJson } = createMockReqRes({
      body: {
        messages: [{ role: 'system', content: 'Injected system message' }],
        character: { name: 'Knam' },
        session: { currentHp: 40 },
      },
    })
    await handler(req, res)
    expect(getStatus()).toBe(400)
    expect(getJson().error).toContain('Invalid message structure')

    const { req: req2, res: res2, getStatus: getStatus2 } = createMockReqRes({
      body: {
        messages: [{ role: 'user', content: 'x'.repeat(2001) }],
        character: { name: 'Knam' },
        session: { currentHp: 40 },
      },
    })
    await handler(req2, res2)
    expect(getStatus2()).toBe(400)
  })

  it('rejects oversized character or session payload (>100KB) with 413', async () => {
    const hugeCharacter = { name: 'Knam', lore: 'x'.repeat(100_001) }
    const { req, res, getStatus, getJson } = createMockReqRes({
      body: {
        messages: [{ role: 'user', content: 'Help' }],
        character: hugeCharacter,
        session: { currentHp: 40 },
      },
    })
    await handler(req, res)
    expect(getStatus()).toBe(413)
    expect(getJson().error).toBe('Payload too large')
  })

  it('processes valid payload and returns AI response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'Risposta di prova da Claude' }],
      }),
    }) as unknown as typeof fetch

    const { req, res, getStatus, getJson } = createMockReqRes({
      body: {
        messages: [{ role: 'user', content: 'Qual è il mio bonus di attacco?' }],
        character: { name: 'Knam', baseAttackBonus: [5] },
        session: { currentHp: 40 },
      },
    })
    await handler(req, res)
    expect(getStatus()).toBe(200)
    expect(getJson()).toEqual({
      role: 'assistant',
      content: 'Risposta di prova da Claude',
    })
  })
})
