import { neon } from '@neondatabase/serverless'
import { nanoid } from 'nanoid'
import type { ApiRequest, ApiResponse, SqlTagFn } from './sessions'
import { getDatabaseUrl } from './sessions'

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

export const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
export const DEFAULT_UPLOAD_PASSPHRASE = 'reliquary_secret'

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

function parseUrlParams(url?: string): { id?: string; download?: boolean } {
  if (!url) return {}
  try {
    const parsed = new URL(url, 'http://localhost')
    const id = parsed.searchParams.get('id') ?? undefined
    const download = parsed.searchParams.get('download') === '1' || parsed.searchParams.get('download') === 'true'
    return { id, download }
  } catch {
    return {}
  }
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
    playerName: string
    notes?: string
    fileName: string
    downloadUrl: string
  },
  config: { botToken: string | null; chatId: string | null },
  fetchFn: typeof fetch = fetch
): Promise<boolean> {
  if (!config.botToken || !config.chatId) {
    return false
  }

  const message = [
    '⚔️ *[Neon Reliquary] Nuova Scheda Caricata!*',
    '',
    `👤 *Personaggio:* ${params.characterName}`,
    `🎲 *Giocatore:* ${params.playerName}`,
    params.notes ? `📝 *Note:* ${params.notes}` : null,
    `📄 *File:* \`${params.fileName}\``,
    '',
    `🔗 [Scarica Scheda dal Reliquiario](${params.downloadUrl})`,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const res = await fetchFn(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: 'Markdown',
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
  const dbUrl = options?.sql ? 'injected' : getDatabaseUrl(env)
  const sql: SqlTagFn | null = options?.sql ?? (dbUrl ? (neon(dbUrl) as unknown as SqlTagFn) : null)

  const { id: queryId, download: isDownload } = parseUrlParams((req as { url?: string }).url)

  try {
    if (sql) {
      await ensureSheetsSchema(sql, options?.sql ? undefined : dbUrl ?? undefined)
    }

    // --- GET /api/sheets ---
    if (req.method === 'GET') {
      // 1. Download specific PDF
      if (queryId && isDownload) {
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
          res.status(404).json({ error: 'Scheda non trovata' })
          return
        }

        const base64Data = record.pdf_data.includes(',')
          ? record.pdf_data.split(',')[1]
          : record.pdf_data

        const pdfBuffer = Buffer.from(base64Data, 'base64')
        res.setHeader?.('Content-Type', 'application/pdf')
        res.setHeader?.(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(record.file_name)}"`
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
      if (!playerName || playerName.length > 100) {
        res.status(400).json({ error: 'Nome giocatore obbligatorio (max 100 caratteri)' })
        return
      }
      if (!fileName.toLowerCase().endsWith('.pdf')) {
        res.status(400).json({ error: 'Il file deve essere in formato PDF' })
        return
      }
      if (fileSize <= 0 || fileSize > MAX_PDF_SIZE_BYTES) {
        res.status(400).json({ error: 'La dimensione del file supera il limite massimo di 10 MB' })
        return
      }
      if (!pdfBase64) {
        res.status(400).json({ error: 'Contenuto del file PDF mancante' })
        return
      }

      const id = nanoid(12)
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

      // Telegram notification
      const telegramConfig = getTelegramConfig(env)
      const baseAppUrl = telegramConfig.baseUrl || 'https://neon-reliquary.vercel.app'
      const downloadUrl = `${baseAppUrl}/api/sheets?id=${id}&download=1`

      sendTelegramNotification(
        {
          characterName,
          playerName,
          notes,
          fileName,
          downloadUrl,
        },
        telegramConfig,
        options?.fetchFn ?? fetch
      ).catch((err) => console.error('Telegram notification error:', err))

      res.status(201).json({
        ok: true,
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
