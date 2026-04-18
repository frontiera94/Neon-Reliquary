/* eslint-disable */
// Vercel serverless function — not included in project tsconfig

import { list, put } from '@vercel/blob'

async function fetchState(id: string): Promise<{ state: any; blobUrl: string } | null> {
  const { blobs } = await list({ prefix: `maps/${id}/state.json` })
  if (!blobs.length) return null
  const stateRes = await fetch(blobs[0].url)
  if (!stateRes.ok) return null
  const state = await stateRes.json()
  return { state, blobUrl: blobs[0].url }
}

export default async function handler(req: any, res: any) {
  const { id } = req.query

  if (req.method === 'GET') {
    let result: { state: any; blobUrl: string } | null
    try {
      result = await fetchState(id)
    } catch (e) {
      console.error('Blob fetch error:', e)
      res.status(500).json({ error: 'Failed to fetch map', detail: String(e) })
      return
    }

    if (!result) {
      res.status(404).json({ error: 'Map not found' })
      return
    }

    const { secret: _, ...publicState } = result.state
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json(publicState)
    return
  }

  if (req.method === 'PUT') {
    const gmSecret = req.headers['x-gm-secret']
    if (!gmSecret) {
      res.status(401).json({ error: 'Missing x-gm-secret header' })
      return
    }

    let result: { state: any; blobUrl: string } | null
    try {
      result = await fetchState(id)
    } catch (e) {
      console.error('Blob fetch error:', e)
      res.status(500).json({ error: 'Failed to fetch map', detail: String(e) })
      return
    }

    if (!result) {
      res.status(404).json({ error: 'Map not found' })
      return
    }

    if (gmSecret !== result.state.secret) {
      res.status(401).json({ error: 'Invalid secret' })
      return
    }

    let body: any
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    } catch {
      res.status(400).json({ error: 'Invalid JSON body' })
      return
    }

    const fullState = { ...body, secret: result.state.secret, id, updatedAt: Date.now() }

    try {
      await put(`maps/${id}/state.json`, JSON.stringify(fullState), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      })
    } catch (e) {
      console.error('Blob put error:', e)
      res.status(500).json({ error: 'Failed to save map', detail: String(e) })
      return
    }

    res.status(200).json({ ok: true })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
