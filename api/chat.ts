/* eslint-disable */
// Vercel serverless function — not included in project tsconfig

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'API key not configured' })
    return
  }

  // Parse body: Vercel may pass it as a raw string depending on runtime version
  let body: { messages: { role: string; content: string }[]; character: unknown; session: unknown }
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' })
    return
  }

  const { messages, character, session } = body

  if (!Array.isArray(messages) || !character || !session) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }

  const systemPrompt = `Sei un esperto di Pathfinder 1a Edizione e del personaggio descritto qui sotto. Rispondi SEMPRE in italiano. Quando citi regole, menziona il nome preciso del feat, dell'abilità di classe o della spell. Usa i dati statici del personaggio (feat, BAB, spell DC, class abilities) per sapere cosa il personaggio può fare; usa lo stato di sessione per sapere cosa è già stato speso (HP correnti, slot incantesimo, risorse giornaliere, buff attivi, condizioni).

<personaggio>
${JSON.stringify(character, null, 2)}
</personaggio>

<stato_sessione>
${JSON.stringify(session, null, 2)}
</stato_sessione>`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic error:', err)
      res.status(500).json({ error: 'Errore dalla AI', detail: err })
      return
    }

    const data = await response.json() as { content: { type: string; text: string }[] }
    const text = data.content[0]?.text ?? ''
    res.status(200).json({ role: 'assistant', content: text })
  } catch (e) {
    console.error('Chat handler error:', e)
    res.status(500).json({ error: 'Errore interno del server', detail: String(e) })
  }
}
