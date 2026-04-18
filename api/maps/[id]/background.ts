/* eslint-disable */
// Vercel serverless function — not included in project tsconfig

import { list, put } from '@vercel/blob'

async function fetchState(id: string): Promise<any | null> {
  const { blobs } = await list({ prefix: `maps/${id}/state.json` })
  if (!blobs.length) return null
  const stateRes = await fetch(blobs[0].url)
  if (!stateRes.ok) return null
  return stateRes.json()
}

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { id } = req.query

  const gmSecret = req.headers['x-gm-secret']
  if (!gmSecret) {
    res.status(401).json({ error: 'Missing x-gm-secret header' })
    return
  }

  // Fetch current state and verify secret
  let state: any
  try {
    state = await fetchState(id)
  } catch (e) {
    console.error('Blob fetch error:', e)
    res.status(500).json({ error: 'Failed to fetch map', detail: String(e) })
    return
  }

  if (!state) {
    res.status(404).json({ error: 'Map not found' })
    return
  }

  if (gmSecret !== state.secret) {
    res.status(401).json({ error: 'Invalid secret' })
    return
  }

  // Parse body
  let body: { dataUrl: string }
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' })
    return
  }

  const { dataUrl } = body
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    res.status(400).json({ error: 'dataUrl must be a valid image data URL' })
    return
  }

  // Parse data URL: data:<mimeType>;base64,<data>
  const commaIdx = dataUrl.indexOf(',')
  if (commaIdx === -1) {
    res.status(400).json({ error: 'Invalid data URL format' })
    return
  }

  const header = dataUrl.slice(5, commaIdx) // strip "data:"
  const [mimeType] = header.split(';')
  const base64Data = dataUrl.slice(commaIdx + 1)

  const ext = MIME_TO_EXT[mimeType] ?? 'bin'
  const buffer = Buffer.from(base64Data, 'base64')

  if (buffer.length > 5 * 1024 * 1024) {
    res.status(413).json({ error: 'Image exceeds 5 MB limit' })
    return
  }

  let blob: { url: string }
  try {
    blob = await put(`maps/${id}/background.${ext}`, buffer, {
      access: 'public',
      contentType: mimeType,
      addRandomSuffix: false,
      allowOverwrite: true,
    })
  } catch (e) {
    console.error('Blob put error (background):', e)
    res.status(500).json({ error: 'Failed to upload background', detail: String(e) })
    return
  }

  // Update state.json with new background url
  const updatedState = {
    ...state,
    updatedAt: Date.now(),
    background: { url: blob.url, width: 0, height: 0 },
  }

  try {
    await put(`maps/${id}/state.json`, JSON.stringify(updatedState), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    })
  } catch (e) {
    console.error('Blob put error (state update):', e)
    // Background was uploaded but state wasn't updated — not fatal, return success anyway
    console.warn('Background uploaded but state.json not updated:', e)
  }

  res.status(200).json({ url: blob.url, width: 0, height: 0 })
}
