import { NextRequest, NextResponse } from 'next/server'
import { VALID_CATEGORIES } from '@/lib/importar/categorias-map'

// Activar con AI_CLASSIFY_ENABLED=true y GEMINI_API_KEY en .env.local
// API key gratuita en aistudio.google.com
const ENABLED = process.env.AI_CLASSIFY_ENABLED === 'true'
const MODEL   = 'gemini-2.0-flash'

// ── Configuración de lotes y rate limiting ─────────────────────
const BATCH_SIZE    = 10    // ítems por llamada Gemini
const BATCH_DELAY   = 2000  // ms de pausa entre lotes (cortesía con el tier gratuito)
const MAX_RETRIES   = 3     // reintentos por lote ante 429
const RETRY_BASE_MS = 5000  // backoff base: 5 s → 10 s → 20 s

// ──────────────────────────────────────────────────────────────
interface ClassifyItem { rowIdx: number; descripcion: string }

export interface ClassifyResult {
  rowIdx:    number
  suggested: string | null
  failed?:   boolean   // true si el lote no pudo procesarse tras todos los reintentos
}

// ──────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

function buildPrompt(items: ClassifyItem[], categories: readonly string[]): string {
  return `Eres un clasificador experto de materiales eléctricos industriales.
Para cada descripción, elige la categoría más adecuada de la lista.
Si ninguna aplica claramente, devuelve null para ese ítem.

Responde SOLO con un JSON array de ${items.length} objetos.
Formato: [{"rowIdx":<número>,"suggested":"<categoría exacta o null>"}]

Categorías válidas (copia el nombre exactamente):
${categories.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Materiales:
${items.map(i => `rowIdx ${i.rowIdx}: "${i.descripcion}"`).join('\n')}`
}

function parseAndValidate(
  raw: string,
  items: ClassifyItem[],
  catLower: Map<string, string>,
): ClassifyResult[] {
  let parsed: { rowIdx: number; suggested: string | null }[]
  try {
    parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error()
  } catch {
    const match = raw.match(/\[[\s\S]*\]/)
    try { parsed = JSON.parse(match?.[0] ?? '[]') }
    catch { return items.map(i => ({ rowIdx: i.rowIdx, suggested: null, failed: true })) }
  }

  return parsed.map(r => ({
    rowIdx:    r.rowIdx,
    suggested: r.suggested
      ? (catLower.get(String(r.suggested).toLowerCase().trim()) ?? null)
      : null,
  }))
}

// ── Llamada a Gemini con reintentos ante 429 ──────────────────
async function callGeminiBatch(
  items:     ClassifyItem[],
  apiKey:    string,
  categories: readonly string[],
  catLower:  Map<string, string>,
): Promise<ClassifyResult[]> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`
  const prompt   = buildPrompt(items, categories)

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let res: Response
    try {
      res = await fetch(endpoint, {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens:  512,
            temperature:      0.1,
          },
        }),
      })
    } catch (netErr: any) {
      // Error de red — no reintentar (probable problema de conectividad)
      console.error(`[classify] network error en lote:`, netErr.message)
      return items.map(i => ({ rowIdx: i.rowIdx, suggested: null, failed: true }))
    }

    if (res.status === 429) {
      const wait = RETRY_BASE_MS * attempt   // 5 s, 10 s, 20 s
      console.warn(`[classify] 429 en lote — reintento ${attempt}/${MAX_RETRIES} en ${wait / 1000} s`)
      if (attempt < MAX_RETRIES) {
        await sleep(wait)
        continue
      }
      // Reintentos agotados
      return items.map(i => ({ rowIdx: i.rowIdx, suggested: null, failed: true }))
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as any
      console.error(`[classify] Gemini error ${res.status}:`, body?.error?.message)
      return items.map(i => ({ rowIdx: i.rowIdx, suggested: null, failed: true }))
    }

    const data = await res.json() as any
    const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
    return parseAndValidate(raw, items, catLower)
  }

  // Nunca debería llegar aquí
  return items.map(i => ({ rowIdx: i.rowIdx, suggested: null, failed: true }))
}

// ── Endpoint principal ─────────────────────────────────────────
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

  const { items = [] }: { items: ClassifyItem[] } = await req.json()
  if (!items.length) return NextResponse.json([])

  const categories = VALID_CATEGORIES
  const catLower   = new Map(categories.map(c => [c.toLowerCase(), c]))

  // ── Dividir en lotes de BATCH_SIZE ────────────────────────
  const batches: ClassifyItem[][] = []
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    batches.push(items.slice(i, i + BATCH_SIZE))
  }

  console.log(`[classify] ${items.length} ítems → ${batches.length} lote(s) de máx ${BATCH_SIZE}`)

  const results: ClassifyResult[] = []

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b]
    console.log(`[classify] Lote ${b + 1}/${batches.length} (${batch.length} ítems)`)

    const batchResults = await callGeminiBatch(batch, apiKey, categories, catLower)
    results.push(...batchResults)

    // Pausa entre lotes (excepto tras el último)
    if (b < batches.length - 1) {
      console.log(`[classify] Pausa ${BATCH_DELAY} ms antes del siguiente lote…`)
      await sleep(BATCH_DELAY)
    }
  }

  const failedCount = results.filter(r => r.failed).length
  if (failedCount > 0) {
    console.warn(`[classify] ${failedCount} ítem(s) no procesados tras reintentos`)
  }

  return NextResponse.json(results)
}
