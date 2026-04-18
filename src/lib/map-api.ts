import type { PublicMapState } from '../types/map'

export async function createMap(): Promise<{ id: string; secret: string; gmUrl: string; readOnlyUrl: string }> {
  const res = await fetch('/api/maps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })

  if (!res.ok) {
    let detail = ''
    try {
      const errBody = (await res.json()) as { error?: string; detail?: string }
      detail = errBody.detail ?? errBody.error ?? ''
    } catch {
      /* ignore */
    }
    throw new Error(`HTTP ${res.status}${detail ? ': ' + detail : ''}`)
  }

  const data = (await res.json()) as { id: string; secret: string; gmUrl: string; readOnlyUrl: string }
  return data
}

export async function fetchMap(id: string): Promise<PublicMapState> {
  const res = await fetch(`/api/maps/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    let detail = ''
    try {
      const errBody = (await res.json()) as { error?: string; detail?: string }
      detail = errBody.detail ?? errBody.error ?? ''
    } catch {
      /* ignore */
    }
    throw new Error(`HTTP ${res.status}${detail ? ': ' + detail : ''}`)
  }

  const data = (await res.json()) as PublicMapState
  return data
}

export async function pushMap(id: string, secret: string, state: PublicMapState): Promise<void> {
  const res = await fetch(`/api/maps/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-gm-secret': secret,
    },
    body: JSON.stringify(state),
  })

  if (!res.ok) {
    let detail = ''
    try {
      const errBody = (await res.json()) as { error?: string; detail?: string }
      detail = errBody.detail ?? errBody.error ?? ''
    } catch {
      /* ignore */
    }
    throw new Error(`HTTP ${res.status}${detail ? ': ' + detail : ''}`)
  }
}

export async function uploadBackground(
  id: string,
  secret: string,
  dataUrl: string
): Promise<{ url: string; width: number; height: number }> {
  const res = await fetch(`/api/maps/${id}/background`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gm-secret': secret,
    },
    body: JSON.stringify({ dataUrl }),
  })

  if (!res.ok) {
    let detail = ''
    try {
      const errBody = (await res.json()) as { error?: string; detail?: string }
      detail = errBody.detail ?? errBody.error ?? ''
    } catch {
      /* ignore */
    }
    throw new Error(`HTTP ${res.status}${detail ? ': ' + detail : ''}`)
  }

  const data = (await res.json()) as { url: string; width: number; height: number }
  return data
}
