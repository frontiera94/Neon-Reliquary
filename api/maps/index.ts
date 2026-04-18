/* eslint-disable */
// Vercel serverless function — not included in project tsconfig

import { put } from '@vercel/blob'
import { nanoid } from 'nanoid'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const id = nanoid(10)
  const secret = nanoid(24)

  const state = {
    id,
    secret,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    background: null,
    grid: { size: 50 },
    tokens: [],
    shapes: [],
    labels: [],
    fog: { cols: 20, rows: 15, cells: new Array(20 * 15).fill(0) },
    initiative: { order: [], currentIndex: 0, round: 1 },
  }

  try {
    await put(`maps/${id}/state.json`, JSON.stringify(state), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    })
  } catch (e) {
    console.error('Blob put error:', e)
    res.status(500).json({ error: 'Failed to create map', detail: String(e) })
    return
  }

  res.status(201).json({
    id,
    secret,
    gmUrl: '/gm/map/' + id,
    readOnlyUrl: '/map/' + id,
  })
}
