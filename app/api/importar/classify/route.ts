import { NextRequest, NextResponse } from 'next/server'
import { VALID_CATEGORIES } from '@/lib/importar/categorias-map'

// Activar con AI_CLASSIFY_ENABLED=true en .env.local (requiere también ANTHROPIC_API_KEY)
const ENABLED = process.env.AI_CLASSIFY_ENABLED === 'true'

interface ClassifyItem { rowIdx: number; descripcion: string }

export async function POST(req: NextRequest) {
  if (!ENABLED) {
    return NextResponse.json({ error: 'Clasificación IA no activada en esta instalación' }, { status: 403 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada en el servidor' }, { status: 500 })
  }

  const body = await req.json() as { items: ClassifyItem[]; categories?: string[] }
  const items: ClassifyItem[] = body.items ?? []
  if (!items.length) return NextResponse.json([])

  // Solo admitir categorías de nuestra lista
  const categories: string[] = [...VALID_CATEGORIES]

  const prompt = `Eres un clasificador de materiales eléctricos industriales.
Para cada descripción, elige la categoría más adecuada de la lista de abajo.
Si ninguna aplica claramente, devuelve null.
Responde ÚNICAMENTE con un JSON array válido, sin texto ni explicaciones extra.

Formato de respuesta:
[{"rowIdx": <número>, "suggested": "<nombre exacto de la categoría o null>"}]

Categorías válidas:
${categories.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Materiales a clasificar:
${items.map(i => `rowIdx ${i.rowIdx}: "${i.descripcion}"`).join('\n')}`

  let raw: string
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages:   [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({ error: `Anthropic API error ${res.status}: ${(err as any)?.error?.message ?? ''}` }, { status: 502 })
    }
    const data = await res.json()
    raw = data.content?.[0]?.text ?? '[]'
  } catch (e: any) {
    return NextResponse.json({ error: 'Error de red al llamar a la API de IA: ' + e.message }, { status: 502 })
  }

  // Parsear y validar resultado
  let parsed: { rowIdx: number; suggested: string | null }[]
  try {
    // Extraer solo el array JSON si viene con texto extra
    const match = raw.match(/\[[\s\S]*\]/)
    parsed = JSON.parse(match?.[0] ?? '[]')
  } catch {
    return NextResponse.json({ error: 'La IA devolvió una respuesta no parseable', raw }, { status: 502 })
  }

  // Validar que las categorías sugeridas existen en nuestra lista (case-insensitive)
  const catLower = new Map(categories.map(c => [c.toLowerCase(), c]))
  const results = parsed.map(r => ({
    rowIdx:    r.rowIdx,
    suggested: r.suggested
      ? (catLower.get(String(r.suggested).toLowerCase()) ?? null)
      : null,
  }))

  return NextResponse.json(results)
}
