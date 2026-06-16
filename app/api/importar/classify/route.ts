import { NextRequest, NextResponse } from 'next/server'
import { VALID_CATEGORIES } from '@/lib/importar/categorias-map'

// Activar con AI_CLASSIFY_ENABLED=true en .env.local (requiere también GEMINI_API_KEY)
// API key gratuita en aistudio.google.com
const ENABLED = process.env.AI_CLASSIFY_ENABLED === 'true'
const MODEL   = 'gemini-2.0-flash'

interface ClassifyItem { rowIdx: number; descripcion: string }

export async function POST(req: NextRequest) {
  if (!ENABLED) {
    return NextResponse.json(
      { error: 'Clasificación IA no activada. Agrega AI_CLASSIFY_ENABLED=true y GEMINI_API_KEY en .env.local' },
      { status: 403 },
    )
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY no configurada en el servidor' },
      { status: 500 },
    )
  }

  const body  = await req.json() as { items: ClassifyItem[] }
  const items = body.items ?? []
  if (!items.length) return NextResponse.json([])

  const categories = [...VALID_CATEGORIES]

  const prompt = `Eres un clasificador experto de materiales eléctricos industriales.
Para cada descripción de material, elige la categoría más adecuada de la lista de abajo.
Si ninguna categoría aplica claramente, devuelve null para ese ítem.

Responde SOLO con un JSON array con exactamente ${items.length} objetos.
Formato: [{"rowIdx": <número>, "suggested": "<nombre exacto de la categoría o null>"}]

Categorías válidas (copia el nombre exactamente como aparece aquí):
${categories.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Materiales a clasificar:
${items.map(i => `rowIdx ${i.rowIdx}: "${i.descripcion}"`).join('\n')}`

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`

  let raw: string
  try {
    const res = await fetch(endpoint, {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens:  1024,
          temperature:      0.1,
        },
      }),
    })

    if (res.status === 429) {
      return NextResponse.json(
        { error: 'Límite de tasa de la API de Gemini alcanzado. Espera unos segundos e intenta de nuevo.' },
        { status: 429 },
      )
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as any
      const msg = err?.error?.message ?? `Gemini API error ${res.status}`
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const data = await res.json() as any
    // Gemini devuelve: candidates[0].content.parts[0].text
    raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Error de red al llamar a Gemini: ' + e.message },
      { status: 502 },
    )
  }

  // Parsear respuesta — ya debe ser JSON válido por responseMimeType
  let parsed: { rowIdx: number; suggested: string | null }[]
  try {
    parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('respuesta no es array')
  } catch {
    // Fallback: intentar extraer array con regex
    const match = raw.match(/\[[\s\S]*\]/)
    try { parsed = JSON.parse(match?.[0] ?? '[]') }
    catch { return NextResponse.json({ error: 'Gemini devolvió una respuesta no parseable', raw }, { status: 502 }) }
  }

  // Validar que las categorías sugeridas pertenecen a nuestra lista (case-insensitive)
  const catLower = new Map(categories.map(c => [c.toLowerCase(), c]))
  const results = parsed.map(r => ({
    rowIdx:    r.rowIdx,
    suggested: r.suggested
      ? (catLower.get(String(r.suggested).toLowerCase().trim()) ?? null)
      : null,
  }))

  return NextResponse.json(results)
}
