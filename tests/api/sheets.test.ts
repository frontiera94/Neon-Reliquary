import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  handleSheetsRequest,
  sendTelegramNotification,
  getUploadPassphrase,
  getTelegramConfig,
  DEFAULT_UPLOAD_PASSPHRASE,
  MAX_PDF_SIZE_BYTES,
} from '../../api/sheets'
import type { ApiResponse } from '../../api/sessions'

function createMockRes() {
  let statusCode = 200
  let jsonBody: unknown = undefined
  let sentBuffer: Buffer | string | undefined = undefined
  const headers: Record<string, string> = {}

  const res: ApiResponse & { send?: (data: Buffer | string) => void } = {
    setHeader: (name, value) => {
      headers[name] = value
    },
    status: (code) => {
      statusCode = code
      return {
        json: (payload) => {
          jsonBody = payload
        },
        end: () => {},
        send: (data: Buffer | string) => {
          sentBuffer = data
        },
      }
    },
  }

  return {
    res,
    getStatus: () => statusCode,
    getJson: () => jsonBody,
    getHeaders: () => headers,
    getSentBuffer: () => sentBuffer,
  }
}

describe('api/sheets serverless handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves upload passphrase with fallback', () => {
    expect(getUploadPassphrase({})).toBe(DEFAULT_UPLOAD_PASSPHRASE)
    expect(getUploadPassphrase({ UPLOAD_PASSPHRASE: 'custom_pass' })).toBe('custom_pass')
  })

  it('resolves telegram configuration', () => {
    expect(getTelegramConfig({})).toEqual({ botToken: null, chatId: null, baseUrl: '' })
    expect(
      getTelegramConfig({
        TELEGRAM_BOT_TOKEN: '12345:TOKEN',
        TELEGRAM_CHAT_ID: '98765',
        APP_BASE_URL: 'https://reliquary.app',
      })
    ).toEqual({
      botToken: '12345:TOKEN',
      chatId: '98765',
      baseUrl: 'https://reliquary.app',
    })
  })

  it('rejects POST upload with invalid password', async () => {
    const mock = createMockRes()
    await handleSheetsRequest(
      {
        method: 'POST',
        body: {
          characterName: 'Valeros',
          playerName: 'Alice',
          fileName: 'valeros.pdf',
          fileSize: 1024,
          pdfBase64: 'JVBERi0xLjQK...',
          password: 'wrong_password',
        },
      },
      mock.res,
      { env: { UPLOAD_PASSPHRASE: 'correct_pass' } }
    )

    expect(mock.getStatus()).toBe(401)
    expect((mock.getJson() as { error: string }).error).toContain('non corretta')
  })

  it('rejects POST upload if file is not a PDF', async () => {
    const mock = createMockRes()
    await handleSheetsRequest(
      {
        method: 'POST',
        body: {
          characterName: 'Valeros',
          playerName: 'Alice',
          fileName: 'valeros.exe',
          fileSize: 1024,
          pdfBase64: 'JVBERi0xLjQK...',
          password: DEFAULT_UPLOAD_PASSPHRASE,
        },
      },
      mock.res,
      { env: {} }
    )

    expect(mock.getStatus()).toBe(400)
    expect((mock.getJson() as { error: string }).error).toContain('PDF')
  })

  it('rejects POST upload if file exceeds max size limit', async () => {
    const mock = createMockRes()
    await handleSheetsRequest(
      {
        method: 'POST',
        body: {
          characterName: 'Valeros',
          playerName: 'Alice',
          fileName: 'valeros.pdf',
          fileSize: MAX_PDF_SIZE_BYTES + 1,
          pdfBase64: 'JVBERi0xLjQK...',
          password: DEFAULT_UPLOAD_PASSPHRASE,
        },
      },
      mock.res,
      { env: {} }
    )

    expect(mock.getStatus()).toBe(400)
    expect((mock.getJson() as { error: string }).error).toContain('3.2 MB')
  })

  it('successfully creates a sheet upload, dispatches Telegram notification, and returns 201', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    const mock = createMockRes()

    await handleSheetsRequest(
      {
        method: 'POST',
        body: {
          characterName: 'Agelmund',
          playerName: 'Fabio',
          notes: 'Level 5 upgrade: preso Weapon Focus',
          fileName: 'Agelmund_lvl5.pdf',
          fileSize: 98000,
          pdfBase64: Buffer.from('PDF_SAMPLE_DATA').toString('base64'),
          password: 'my_secret_token',
        },
      },
      mock.res,
      {
        env: {
          UPLOAD_PASSPHRASE: 'my_secret_token',
          TELEGRAM_BOT_TOKEN: 'bot12345',
          TELEGRAM_CHAT_ID: 'chat67890',
          APP_BASE_URL: 'https://test.reliquary.app',
        },
        fetchFn: mockFetch as unknown as typeof fetch,
      }
    )

    expect(mock.getStatus()).toBe(201)
    const json = mock.getJson() as { ok: boolean; sheet: { id: string; characterName: string } }
    expect(json.ok).toBe(true)
    expect(json.sheet.characterName).toBe('Agelmund')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [telegramUrl, fetchOpts] = mockFetch.mock.calls[0]
    expect(telegramUrl).toContain('bot12345/sendMessage')
    const telegramBody = JSON.parse(fetchOpts.body)
    expect(telegramBody.chat_id).toBe('chat67890')
    expect(telegramBody.text).toContain('Agelmund')
    expect(telegramBody.text).toContain('Fabio')
    expect(telegramBody.text).toContain('Weapon Focus')
  })

  it('allows upload without playerName (optional)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    const mock = createMockRes()

    await handleSheetsRequest(
      {
        method: 'POST',
        body: {
          characterName: 'Knam',
          fileName: 'Knam_sheet.pdf',
          fileSize: 50000,
          pdfBase64: Buffer.from('PDF_SAMPLE').toString('base64'),
          password: DEFAULT_UPLOAD_PASSPHRASE,
        },
      },
      mock.res,
      {
        env: {
          TELEGRAM_BOT_TOKEN: 'bot12345',
          TELEGRAM_CHAT_ID: 'chat67890',
        },
        fetchFn: mockFetch as unknown as typeof fetch,
      }
    )

    expect(mock.getStatus()).toBe(201)
    const json = mock.getJson() as { ok: boolean; sheet: { characterName: string; playerName: string } }
    expect(json.ok).toBe(true)
    expect(json.sheet.characterName).toBe('Knam')
    expect(json.sheet.playerName).toBe('')

    const [, fetchOpts] = mockFetch.mock.calls[0]
    const telegramBody = JSON.parse(fetchOpts.body)
    expect(telegramBody.text).not.toContain('Giocatore:')
  })

  it('lists uploaded sheets and allows status updates and deletion', async () => {
    // 1. List sheets
    const listMock = createMockRes()
    await handleSheetsRequest({ method: 'GET' }, listMock.res, { env: {} })
    expect(listMock.getStatus()).toBe(200)
    const listJson = listMock.getJson() as { ok: boolean; sheets: Array<{ id: string; status: string }> }
    expect(listJson.ok).toBe(true)
    expect(Array.isArray(listJson.sheets)).toBe(true)

    const uploadedId = listJson.sheets[0]?.id
    if (uploadedId) {
      // 2. Download specific sheet
      const downloadMock = createMockRes()
      await handleSheetsRequest(
        { method: 'GET', url: `/api/sheets?id=${uploadedId}&download=1` },
        downloadMock.res,
        { env: {} }
      )
      expect(downloadMock.getStatus()).toBe(200)
      expect(downloadMock.getHeaders()['Content-Type']).toBe('application/pdf')

      // 3. Update status (PATCH)
      const patchMock = createMockRes()
      await handleSheetsRequest(
        {
          method: 'PATCH',
          body: { id: uploadedId, status: 'processing' },
        },
        patchMock.res,
        { env: {} }
      )
      expect(patchMock.getStatus()).toBe(200)
      const patchJson = patchMock.getJson() as { ok: boolean; status: string }
      expect(patchJson.status).toBe('processing')

      // 4. Delete sheet
      const deleteMock = createMockRes()
      await handleSheetsRequest(
        { method: 'DELETE', url: `/api/sheets?id=${uploadedId}` },
        deleteMock.res,
        { env: {} }
      )
      expect(deleteMock.getStatus()).toBe(200)
    }
  })

  it('sendTelegramNotification gracefully fails on network error without throwing', async () => {
    const errorFetch = vi.fn().mockRejectedValue(new Error('Network error'))
    const result = await sendTelegramNotification(
      {
        characterName: 'Maze',
        playerName: 'Marco',
        fileName: 'maze.pdf',
        downloadUrl: 'https://test.app/download',
      },
      { botToken: 'test_token', chatId: 'test_chat' },
      errorFetch as unknown as typeof fetch
    )
    expect(result).toBe(false)
  })
})
