import { describe, it, expect } from 'vitest'
import { handleSheetsRequest, DEFAULT_UPLOAD_PASSPHRASE } from '../../api/sheets'
import type { ApiResponse } from '../../api/sessions'

function createMockRes() {
  let statusCode = 200
  let jsonBody: unknown = undefined
  let sentBody: Buffer | string | undefined = undefined
  const headers: Record<string, string> = {}

  const res: ApiResponse & { send?: (d: Buffer | string) => void } = {
    setHeader: (n, v) => {
      headers[n] = v
    },
    status: (code) => {
      statusCode = code
      return {
        json: (payload) => {
          jsonBody = payload
        },
        end: () => {},
        send: (d: Buffer | string) => {
          sentBody = d
        },
      }
    },
  }

  return {
    res,
    getStatus: () => statusCode,
    getJson: () => jsonBody,
    getHeaders: () => headers,
    getSentBody: () => sentBody,
  }
}

describe('api/sheets security & validation hardening', () => {
  it('rejects non-PDF files disguised with .pdf extension (magic bytes check)', async () => {
    const mock = createMockRes()
    await handleSheetsRequest(
      {
        method: 'POST',
        body: {
          characterName: 'Shotrix',
          fileName: 'malware.pdf',
          fileSize: 64,
          pdfBase64: Buffer.from('MZ\x90\x00not-a-pdf').toString('base64'),
          password: DEFAULT_UPLOAD_PASSPHRASE,
        },
      },
      mock.res,
      { env: {} }
    )
    expect(mock.getStatus()).toBe(400)
    expect((mock.getJson() as { error: string }).error).toContain('%PDF-')
  })

  it('rejects oversized base64 payloads even when client lies about fileSize', async () => {
    const mock = createMockRes()
    const oversized = Buffer.alloc(3.3 * 1024 * 1024, 0x41)
    oversized.write('%PDF-1.4', 0)

    await handleSheetsRequest(
      {
        method: 'POST',
        body: {
          characterName: 'Knam',
          fileName: 'knam.pdf',
          fileSize: 100, // spoofed small fileSize
          pdfBase64: oversized.toString('base64'),
          password: DEFAULT_UPLOAD_PASSPHRASE,
        },
      },
      mock.res,
      { env: {} }
    )
    expect(mock.getStatus()).toBe(400)
    expect((mock.getJson() as { error: string }).error).toContain('3.2 MB')
  })

  it('returns 404 HTML when browser Accept header requests missing sheet', async () => {
    const mock = createMockRes()
    await handleSheetsRequest(
      {
        method: 'GET',
        url: '/api/sheets?id=missing_id_xyz',
        headers: { accept: 'text/html' },
      },
      mock.res,
      { env: {} }
    )
    expect(mock.getStatus()).toBe(404)
    expect(mock.getHeaders()['Content-Type']).toContain('text/html')
    expect(String(mock.getSentBody())).toContain('Scheda non trovata')
  })

  it('validates PATCH status values and DELETE missing ID', async () => {
    const badPatch = createMockRes()
    await handleSheetsRequest(
      { method: 'PATCH', body: { id: 'abc', status: 'hacked' } },
      badPatch.res,
      { env: {} }
    )
    expect(badPatch.getStatus()).toBe(400)

    const badDel = createMockRes()
    await handleSheetsRequest({ method: 'DELETE', body: {} }, badDel.res, { env: {} })
    expect(badDel.getStatus()).toBe(400)
  })
})
