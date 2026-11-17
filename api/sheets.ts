import { neon } from '@neondatabase/serverless'
import type { ApiRequest, ApiResponse, SqlTagFn } from './sessions'

export type SheetStatus = 'new' | 'processing' | 'archived'

export interface UploadedSheetSummary {
  id: string
  characterName: string
  playerName: string
  notes: string
  fileName: string
  fileSize: number
  status: SheetStatus
  createdAt: number
  updatedAt: number
}

export interface UploadedSheetRecord {
  id: string
  character_name: string
  player_name: string
  notes: string
  file_name: string
  file_size: number
  pdf_data: string
  status: SheetStatus
  created_at: string | number | Date
  updated_at: string | number | Date
}

// Vercel serverless request body limit is 4.5 MB.
// A 3.2 MB file encoded in Base64 is ~4.26 MB, perfectly fitting within limits.
export const MAX_PDF_SIZE_BYTES = 3.2 * 1024 * 1024
export const DEFAULT_UPLOAD_PASSPHRASE = 'reliquary_secret'

export function getDatabaseUrl(
  env: Record<string, string | undefined> = process.env
): string | null {
  const raw =
    env.DATABASE_URL ??
    env.POSTGRES_URL ??
    env.NEON_DATABASE_URL ??
    ''
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    }
  } catch {
    // fallback
  }
  return Math.random().toString(36).slice(2, 14)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// In-memory fallback for local development or when DATABASE_URL is not set
const memorySheets = new Map<string, UploadedSheetRecord>()
const ensuredUrls = new Set<string>()

async function ensureSheetsSchema(sql: SqlTagFn, cacheKey?: string): Promise<void> {
  if (cacheKey && ensuredUrls.has(cacheKey)) return
  await sql`
    CREATE TABLE IF NOT EXISTS uploaded_sheets (
      id TEXT PRIMARY KEY,
      character_name TEXT NOT NULL,
      player_name TEXT NOT NULL,
      notes TEXT DEFAULT '',
      file_name TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      pdf_data TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  if (cacheKey) {
    ensuredUrls.add(cacheKey)
  }
}

function parseRequestParams(req: ApiRequest): { id?: string; download?: boolean } {
  const queryObj = (req as { query?: Record<string, string | string[] | undefined> }).query
  let id: string | undefined
  let download = false

  if (queryObj) {
    const rawId = Array.isArray(queryObj.id)
      ? queryObj.id[0]
      : queryObj.id ?? (Array.isArray(queryObj.sheetId) ? queryObj.sheetId[0] : queryObj.sheetId)
    if (typeof rawId === 'string' && rawId.trim()) id = rawId.trim()

    const rawDl = Array.isArray(queryObj.download) ? queryObj.download[0] : queryObj.download
    if (rawDl === '1' || rawDl === 'true') download = true
  }

  if (req.url) {
    try {
      const parsed = new URL(req.url, 'http://localhost')
      if (!id) {
        const rawParam = parsed.searchParams.get('id') ?? parsed.searchParams.get('sheetId')
        if (rawParam && rawParam.trim()) id = rawParam.trim()
      }
      if (!download) {
        const dlVal = parsed.searchParams.get('download')
        download = dlVal === '1' || dlVal === 'true'
      }
      // Support also pathname like /api/sheets/<id>
      if (!id) {
        const parts = parsed.pathname.split('/').filter(Boolean)
        const lastPart = parts[parts.length - 1]
        if (lastPart && lastPart !== 'sheets') {
          id = lastPart.trim()
        }
      }
    } catch {
      // ignore
    }
  }

  // If id is present on a GET request, assume sheet download/view intention
  if (id) {
    download = true
  }

  return { id, download }
}

function resolveBaseAppUrl(req: ApiRequest, env: Record<string, string | undefined>): string {
  const custom = env.APP_BASE_URL?.trim().replace(/\/+$/, '')
  if (custom) return custom

  const forwardedHost = req.headers?.['x-forwarded-host']
  const hostHeader = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : forwardedHost ?? (Array.isArray(req.headers?.host) ? req.headers?.host[0] : req.headers?.host)

  if (hostHeader && typeof hostHeader === 'string' && !hostHeader.startsWith('localhost')) {
    const protoHeader = req.headers?.['x-forwarded-proto']
    const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader || 'https'
    return `${proto}://${hostHeader}`
  }

  if (env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`
  }
  if (env.VERCEL_URL) {
    return `https://${env.VERCEL_URL.trim()}`
  }

  return 'https://neon-reliquary.vercel.app'
}

export function getUploadPassphrase(env: Record<string, string | undefined> = process.env): string {
  const custom = env.UPLOAD_PASSPHRASE?.trim()
  return custom && custom.length > 0 ? custom : DEFAULT_UPLOAD_PASSPHRASE
}

export function getTelegramConfig(env: Record<string, string | undefined> = process.env): {
  botToken: string | null
  chatId: string | null
  baseUrl: string
} {
  const botToken = env.TELEGRAM_BOT_TOKEN?.trim() || null
  const chatId = env.TELEGRAM_CHAT_ID?.trim() || null
  const baseUrl = env.APP_BASE_URL?.trim() || ''
  return { botToken, chatId, baseUrl }
}

export async function sendTelegramNotification(
  params: {
    characterName: string
    playerName?: string
    notes?: string
    fileName: string
    downloadUrl: string
    pdfBase64?: string
  },
  config: { botToken: string | null; chatId: string | null },
  fetchFn: typeof fetch = fetch
): Promise<boolean> {
  if (!config.botToken || !config.chatId) {
    return false
  }

  const safeChar = escapeHtml(params.characterName)
  const safePlayer = params.playerName ? escapeHtml(params.playerName) : ''
  const safeNotes = params.notes ? escapeHtml(params.notes) : ''
  const safeFile = escapeHtml(params.fileName)
  const safeUrl = escapeHtml(params.downloadUrl)

  const message = [
    '⚔️ <b>[Neon Reliquary] Nuova Scheda Caricata!</b>',
    '',
    `👤 <b>Personaggio:</b> ${safeChar}`,
    safePlayer ? `🎲 <b>Giocatore:</b> ${safePlayer}` : null,
    safeNotes ? `📝 <b>Note:</b> ${safeNotes}` : null,
    `📄 <b>File:</b> <code>${safeFile}</code>`,
    '',
    `🔗 <a href="${safeUrl}">Scarica Scheda dal Reliquiario</a>`,
  ]
    .filter(Boolean)
    .join('\n')

  // Try sendDocument first so Telegram attaches the real PDF file directly into chat
  if (params.pdfBase64 && typeof FormData !== 'undefined' && typeof Blob !== 'undefined') {
    try {
      const rawBase64 = params.pdfBase64.includes(',')
        ? params.pdfBase64.split(',')[1]
        : params.pdfBase64
      const pdfBuffer = Buffer.from(rawBase64, 'base64')
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' })

      const formData = new FormData()
      formData.append('chat_id', config.chatId)
      formData.append('document', blob, params.fileName)
      formData.append('caption', message)
      formData.append('parse_mode', 'HTML')

      const docRes = await fetchFn(
        `https://api.telegram.org/bot${config.botToken}/sendDocument`,
        {
          method: 'POST',
          body: formData,
        }
      )
      if (docRes.ok) {
        return true
      }
    } catch {
      // Fall through to sendMessage fallback
    }
  }

  try {
    const res = await fetchFn(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })
    return res.ok
  } catch (err) {
    console.error('Failed to send Telegram notification:', err)
    return false
  }
}

export async function handleSheetsRequest(
  req: ApiRequest,
  res: ApiResponse,
  options?: {
    env?: Record<string, string | undefined>
    sql?: SqlTagFn
    fetchFn?: typeof fetch
  }
): Promise<void> {
  res.setHeader?.('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') {
    const statusRes = res.status(204)
    if (statusRes.end) statusRes.end()
    else statusRes.json({})
    return
  }

  const env = options?.env ?? process.env

  try {
    const dbUrl = options?.sql ? 'injected' : getDatabaseUrl(env)
    let sql: SqlTagFn | null = options?.sql ?? null

    if (!sql && dbUrl) {
      try {
        sql = neon(dbUrl) as unknown as SqlTagFn
      } catch (dbInitErr) {
        console.warn('Neon connection initialization skipped, using fallback:', dbInitErr)
        sql = null
      }
    }

    const { id: queryId } = parseRequestParams(req)

    if (sql) {
      try {
        await ensureSheetsSchema(sql, options?.sql ? undefined : dbUrl ?? undefined)
      } catch (schemaErr) {
        console.warn('Schema check warning, continuing:', schemaErr)
      }
    }

    // --- GET /api/sheets ---
    if (req.method === 'GET') {
      // 1. Download/view specific PDF if id is specified
      if (queryId) {
        let record: UploadedSheetRecord | undefined

        if (sql) {
          const rows = await sql`
            SELECT id, character_name, player_name, notes, file_name, file_size, pdf_data, status, created_at, updated_at
            FROM uploaded_sheets
            WHERE id = ${queryId}
            LIMIT 1
          `
          if (rows.length > 0) {
            record = rows[0] as unknown as UploadedSheetRecord
          }
        } else {
          record = memorySheets.get(queryId)
        }

        if (!record) {
          const isHtmlRequest =
            req.headers?.accept && String(req.headers.accept).includes('text/html')

          if (isHtmlRequest) {
            res.setHeader?.('Content-Type', 'text/html; charset=utf-8')
            const statusObj = res.status(404) as {
              send?: (body: string) => void
              json: (p: unknown) => void
            }
            const htmlMessage = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <title>Scheda non trovata - Neon Reliquary</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { background: #0a0e17; color: #e2e8f0; font-family: ui-sans-serif, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; box-sizing: border-box; }
    .card { background: #131a29; border: 1px solid rgba(0, 240, 255, 0.2); box-shadow: 0 0 30px rgba(0, 240, 255, 0.08); border-radius: 1rem; padding: 2.5rem 2rem; max-width: 440px; text-align: center; }
    h1 { color: #ff3366; font-size: 1.5rem; margin-top: 0; margin-bottom: 0.75rem; font-weight: 700; letter-spacing: 0.05em; }
    p { color: #94a3b8; font-size: 0.9rem; line-height: 1.6; margin-bottom: 1.5rem; }
    a { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: #00f0ff; color: #000; text-decoration: none; border-radius: 0.75rem; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; transition: all 0.2s; }
    a:hover { box-shadow: 0 0 20px rgba(0, 240, 255, 0.5); transform: translateY(-1px); }
  </style>
</head>
<body>
  <div class="card">
    <h1>Scheda non trovata (404)</h1>
    <p>La scheda richiesta non esiste nel database oppure appartiene a una sessione precedente rimossa dall'archivio.</p>
    <a href="/">Torna a Neon Reliquary</a>
  </div>
</body>
</html>`
            if (typeof statusObj.send === 'function') {
              statusObj.send(htmlMessage)
            } else if (typeof (res as unknown as { end: (d: string) => void }).end === 'function') {
              ;(res as unknown as { end: (d: string) => void }).end(htmlMessage)
            } else {
              statusObj.json({ error: 'Scheda non trovata' })
            }
            return
          }

          res.status(404).json({ error: 'Scheda non trovata' })
          return
        }

        const base64Data = record.pdf_data.includes(',')
          ? record.pdf_data.split(',')[1]
          : record.pdf_data

        const pdfBuffer = Buffer.from(base64Data, 'base64')
        const safeAsciiFilename = record.file_name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_')
        res.setHeader?.('Content-Type', 'application/pdf')
        res.setHeader?.(
          'Content-Disposition',
          `inline; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodeURIComponent(record.file_name)}`
        )
        res.setHeader?.('Content-Length', String(pdfBuffer.length))

        const statusObj = res.status(200) as {
          json: (payload: unknown) => void
          end?: () => void
          send?: (data: Buffer | string) => void
        }

        if (typeof statusObj.send === 'function') {
          statusObj.send(pdfBuffer)
        } else if (typeof (res as unknown as { end: (data: Buffer) => void }).end === 'function') {
          ;(res as unknown as { end: (data: Buffer) => void }).end(pdfBuffer)
        } else {
          statusObj.json({
            ok: true,
            base64: record.pdf_data,
            fileName: record.file_name,
          })
        }
        return
      }

      // 2. List all uploaded sheets summary (without pdf_data)
      if (sql) {
        const rows = await sql`
          SELECT
            id,
            character_name,
            player_name,
            notes,
            file_name,
            file_size,
            status,
            (EXTRACT(EPOCH FROM created_at) * 1000)::bigint AS created_at_ms,
            (EXTRACT(EPOCH FROM updated_at) * 1000)::bigint AS updated_at_ms
          FROM uploaded_sheets
          ORDER BY created_at DESC
        `

        const sheets: UploadedSheetSummary[] = rows.map((r) => ({
          id: String(r.id),
          characterName: String(r.character_name),
          playerName: String(r.player_name),
          notes: String(r.notes || ''),
          fileName: String(r.file_name),
          fileSize: Number(r.file_size),
          status: (r.status as SheetStatus) || 'new',
          createdAt: Number(r.created_at_ms ?? Date.now()),
          updatedAt: Number(r.updated_at_ms ?? Date.now()),
        }))

        res.status(200).json({ ok: true, sheets })
        return
      }

      // In-memory fallback
      const sheets: UploadedSheetSummary[] = Array.from(memorySheets.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((r) => ({
          id: r.id,
          characterName: r.character_name,
          playerName: r.player_name,
          notes: r.notes || '',
          fileName: r.file_name,
          fileSize: r.file_size,
          status: r.status,
          createdAt: new Date(r.created_at).getTime(),
          updatedAt: new Date(r.updated_at).getTime(),
        }))

      res.status(200).json({ ok: true, sheets })
      return
    }

    // --- POST /api/sheets (Upload new sheet) ---
    if (req.method === 'POST') {
      let body: Record<string, unknown> = {}
      if (typeof req.body === 'string') {
        try {
          body = JSON.parse(req.body)
        } catch {
          res.status(400).json({ error: 'JSON non valido' })
          return
        }
      } else if (typeof req.body === 'object' && req.body !== null) {
        body = req.body as Record<string, unknown>
      }

      const characterName = typeof body.characterName === 'string' ? body.characterName.trim() : ''
      const playerName = typeof body.playerName === 'string' ? body.playerName.trim() : ''
      const notes = typeof body.notes === 'string' ? body.notes.trim() : ''
      const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : ''
      const fileSize = typeof body.fileSize === 'number' ? body.fileSize : 0
      const pdfBase64 = typeof body.pdfBase64 === 'string' ? body.pdfBase64 : ''
      const password = typeof body.password === 'string' ? body.password : ''

      // Password verification
      const expectedPassphrase = getUploadPassphrase(env)
      if (password !== expectedPassphrase) {
        res.status(401).json({ error: 'Password di caricamento non corretta' })
        return
      }

      // Validations
      if (!characterName || characterName.length > 100) {
        res.status(400).json({ error: 'Nome personaggio obbligatorio (max 100 caratteri)' })
        return
      }
      if (playerName.length > 100) {
        res.status(400).json({ error: 'Nome giocatore non può superare 100 caratteri' })
        return
      }
      if (!fileName.toLowerCase().endsWith('.pdf')) {
        res.status(400).json({ error: 'Il file deve essere in formato PDF' })
        return
      }
      if (fileSize <= 0 || fileSize > MAX_PDF_SIZE_BYTES) {
        res.status(400).json({ error: 'La dimensione del file supera il limite massimo di 3.2 MB' })
        return
      }
      if (!pdfBase64) {
        res.status(400).json({ error: 'Contenuto del file PDF mancante' })
        return
      }

      const id = generateId()
      const now = new Date()

      const newRecord: UploadedSheetRecord = {
        id,
        character_name: characterName,
        player_name: playerName,
        notes,
        file_name: fileName,
        file_size: fileSize,
        pdf_data: pdfBase64,
        status: 'new',
        created_at: now,
        updated_at: now,
      }

      if (sql) {
        await sql`
          INSERT INTO uploaded_sheets (
            id, character_name, player_name, notes, file_name, file_size, pdf_data, status, created_at, updated_at
          ) VALUES (
            ${id}, ${characterName}, ${playerName}, ${notes}, ${fileName}, ${fileSize}, ${pdfBase64}, 'new', ${now.toISOString()}, ${now.toISOString()}
          )
        `
      } else {
        memorySheets.set(id, newRecord)
      }

      // Telegram notification (awaited so Vercel serverless does not freeze before dispatch)
      const telegramConfig = getTelegramConfig(env)
      const baseAppUrl = resolveBaseAppUrl(req, env)
      const downloadUrl = `${baseAppUrl}/api/sheets?id=${id}&download=1`

      const telegramSent = await sendTelegramNotification(
        {
          characterName,
          playerName,
          notes,
          fileName,
          downloadUrl,
          pdfBase64,
        },
        telegramConfig,
        options?.fetchFn ?? fetch
      )

      res.status(201).json({
        ok: true,
        telegramSent,
        dbConfigured: Boolean(sql),
        sheet: {
          id,
          characterName,
          playerName,
          notes,
          fileName,
          fileSize,
          status: 'new',
          createdAt: now.getTime(),
          updatedAt: now.getTime(),
        },
      })
      return
    }

    // --- PATCH /api/sheets (Update status) ---
    if (req.method === 'PATCH') {
      let body: Record<string, unknown> = {}
      if (typeof req.body === 'string') {
        try {
          body = JSON.parse(req.body)
        } catch {
          res.status(400).json({ error: 'JSON non valido' })
          return
        }
      } else if (typeof req.body === 'object' && req.body !== null) {
        body = req.body as Record<string, unknown>
      }

      const targetId = typeof body.id === 'string' ? body.id.trim() : queryId
      const newStatus = body.status as SheetStatus

      if (!targetId) {
        res.status(400).json({ error: 'ID scheda mancante' })
        return
      }

      if (!['new', 'processing', 'archived'].includes(newStatus)) {
        res.status(400).json({ error: 'Stato non valido (deve essere new, processing, o archived)' })
        return
      }

      const now = new Date()

      if (sql) {
        await sql`
          UPDATE uploaded_sheets
          SET status = ${newStatus}, updated_at = ${now.toISOString()}
          WHERE id = ${targetId}
        `
      } else {
        const item = memorySheets.get(targetId)
        if (item) {
          item.status = newStatus
          item.updated_at = now
          memorySheets.set(targetId, item)
        }
      }

      res.status(200).json({ ok: true, id: targetId, status: newStatus })
      return
    }

    // --- DELETE /api/sheets (Delete sheet) ---
    if (req.method === 'DELETE') {
      let targetId = queryId
      if (!targetId && typeof req.body === 'object' && req.body !== null) {
        targetId = (req.body as Record<string, unknown>).id as string | undefined
      }

      if (!targetId) {
        res.status(400).json({ error: 'ID scheda mancante' })
        return
      }

      if (sql) {
        await sql`
          DELETE FROM uploaded_sheets
          WHERE id = ${targetId}
        `
      } else {
        memorySheets.delete(targetId)
      }

      res.status(200).json({ ok: true, id: targetId })
      return
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Sheets API error:', err)
    res.status(500).json({
      error: 'Errore interno del server',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  return handleSheetsRequest(req, res)
}
