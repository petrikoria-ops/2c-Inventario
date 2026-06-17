import { NextRequest, NextResponse } from 'next/server'
import { VALID_CATEGORIES } from '@/lib/importar/categorias-map'

// Activar con AI_CLASSIFY_ENABLED=true y GROQ_API_KEY en .env.local
// API key gratuita en console.groq.com  (formato: gsk_...)
const ENABLED = process.env.AI_CLASSIFY_ENABLED === 'true'
const MODEL   = 'llama-3.1-8b-instant'
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

// ── Configuración de lotes y rate limiting ─────────────────────
// Groq free tier: 30 RPM, 30 000 TPM — más generoso que Gemini
const BATCH_SIZE    = 15    // ítems por llamada
const BATCH_DELAY   = 1000  // ms entre lotes (cortesía con el tier gratuito)
const MAX_RETRIES   = 3     // reintentos ante 429
const RETRY_BASE_MS = 3000  // backoff: 3 s → 6 s → 12 s

// ──────────────────────────────────────────────────────────────
interface ClassifyItem { rowIdx: number; descripcion: string }

export interface ClassifyResult {
  rowIdx:    number
  suggested: string | null
  failed?:   boolean   // true si el lote no pudo procesarse tras todos los reintentos
}

// ──────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

function buildMessages(items: ClassifyItem[], categories: readonly string[]) {
  const catList = categories.map((c, i) => `${i + 1}. ${c}`).join('\n')
  const matList = items.map(i => `rowIdx ${i.rowIdx}: "${i.descripcion}"`).join('\n')

  return [
    {
      role: 'system',
      content:
        'Eres un clasificador experto de materiales eléctricos industriales. ' +
        'Responde SIEMPRE con un JSON array válido, sin texto adicional.',
    },
    {
      role: 'user',
      content:
        `Clasifica cada material en la categoría más adecuada de la lista. ` +
        `Si ninguna aplica claramente usa null.\n\n` +
        `Formato de respuesta — JSON array de ${items.length} objetos:\n` +
        `[{"rowIdx":<número>,"suggested":"<nombre exacto de categoría o null>"}]\n\n` +
        `Categorías válidas (copia el nombre exactamente):\n${catList}\n\n` +
        `Materiales a clasificar:\n${matList}`,
    },
  ]
}

function parseAndValidate(
  raw: string,
  items: ClassifyItem[],
  catLower: Map<string, string>,
): ClassifyResult[] {
  let parsed: { rowIdx: number; suggested: string | null }[]

  try {
    const json = JSON.parse(raw)
    if (Array.isArray(json)) {
      parsed = json
    } else if (json && typeof json === 'object') {
      // Groq a veces envuelve el array en un objeto wrapper
      const inner = Object.values(json).find(v => Array.isArray(v))
      if (inner) parsed = inner as any
      else throw new Error('no array en objeto')
    } else {
      throw new Error('formato inesperado')
    }
  } catch {
    // Fallback: extraer el primer array del texto crudo
    const match = raw.match(/\[[\s\S]*?\]/)
    try {
      parsed = JSON.parse(match?.[0] ?? '[]')
      if (!Array.isArray(parsed)) throw new Error()
    } catch {
      console.error('[classify] No se pudo parsear respuesta de Groq:', raw.slice(0, 300))
      return items.map(i => ({ rowIdx: i.rowIdx, suggested: null, failed: true }))
    }
  }

  return parsed.map(r => ({
    rowIdx:    r.rowIdx,
    suggested: r.suggested
      ? (catLower.get(String(r.suggested).toLowerCase().trim()) ?? null)
      : null,
  }))
}

// ── Llamada a Groq con reintentos ante 429 ────────────────────
async function callGroqBatch(
  items:      ClassifyItem[],
  apiKey:     string,
  categories: readonly string[],
  catLower:   Map<string, string>,
): Promise<ClassifyResult[]> {
  const messages = buildMessages(items, categories)

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let res: Response
    try {
      res = await fetch(GROQ_ENDPOINT, {
        method:  'POST',
        headers: {
          'content-type':  'application/json',
          'authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model:           MODEL,
          messages,
          temperature:     0.1,
          max_tokens:      600,
          response_format: { type: 'json_object' },
        }),
      })
    } catch (netErr: any) {
      console.error('[classify] error de red al llamar a Groq:', netErr.message)
      return items.map(i => ({ rowIdx: i.rowIdx, suggested: null, failed: true }))
    }

    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after')
      const wait = retryAfter ? parseInt(retryAfter, 10) * 1000 : RETRY_BASE_MS * attempt
      console.warn(`[classify] 429 Groq — reintento ${attempt}/${MAX_RETRIES} en ${wait / 1000} s`)
      if (attempt < MAX_RETRIES) { await sleep(wait); continue }
      return items.map(i => ({ rowIdx: i.rowIdx, suggested: null, failed: true }))
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as any
      const msg  = body?.error?.message ?? `HTTP ${res.status}`
      console.error(`[classify] Groq error ${res.status}: ${msg}`)
      return items.map(i => ({ rowIdx: i.rowIdx, suggested: null, failed: true }))
    }

    const data = await res.json() as any
    const raw  = data?.choices?.[0]?.message?.content ?? '[]'
    return parseAndValidate(raw, items, catLower)
  }

  return items.map(i => ({ rowIdx: i.rowIdx, suggested: null, failed: true }))
}

// ── Diagnóstico: GET /api/importar/classify ────────────────────
// Llama a Groq con 1 ítem real y devuelve config + respuesta cruda.
export async function GET() {
  const apiKey  = process.env.GROQ_API_KEY ?? null
  const enabled = process.env.AI_CLASSIFY_ENABLED

  const keyStatus = !apiKey
    ? 'AUSENTE — variable GROQ_API_KEY no definida en el servidor'
    : `presente (${apiKey.slice(0, 8)}…)`

  const config = {
    AI_CLASSIFY_ENABLED:  enabled ?? '(no definida)',
    GROQ_API_KEY:         keyStatus,
    model:                MODEL,
    endpoint:             GROQ_ENDPOINT,
    batchSize:            BATCH_SIZE,
    batchDelayMs:         BATCH_DELAY,
    maxRetries:           MAX_RETRIES,
  }

  if (!apiKey) {
    return NextResponse.json({ config, test: { skip: 'Sin API key — imposible llamar a Groq' } })
  }

  // Prueba real con 1 ítem
  const testMessages = [
    { role: 'system', content: 'Eres un clasificador de materiales eléctricos. Responde SIEMPRE con JSON array válido.' },
    { role: 'user',   content: 'Clasifica este material. Formato: [{"rowIdx":0,"suggested":"<categoría o null>"}]\nCategorías: Conductores y Cables, Protecciones (Automáticos), Borneras y Terminales\nMaterial: rowIdx 0: "Cable THHN 2.5mm2 negro"' },
  ]

  let httpStatus = 0
  let rawBody    = ''
  let errorMsg:  string | null = null

  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method:  'POST',
      headers: { 'content-type': 'application/json', 'authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL, messages: testMessages, temperature: 0, max_tokens: 64, response_format: { type: 'json_object' } }),
    })
    httpStatus = res.status
    rawBody    = await res.text()
    if (!res.ok) {
      const j = JSON.parse(rawBody).catch?.() ?? JSON.parse(rawBody)
      errorMsg = (j as any)?.error?.message ?? `HTTP ${httpStatus}`
    }
  } catch (e: any) {
    errorMsg = 'Error de red: ' + e.message
  }

  return NextResponse.json({
    config,
    test: {
      httpStatus,
      ok:      httpStatus === 200,
      errorMsg,
      rawBody: rawBody.length > 1500 ? rawBody.slice(0, 1500) + '…(truncado)' : rawBody,
    },
  })
}

// ── Endpoint principal ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!ENABLED) {
    return NextResponse.json(
      { error: 'Clasificación IA no activada. Agrega AI_CLASSIFY_ENABLED=true y GROQ_API_KEY en .env.local' },
      { status: 403 },
    )
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GROQ_API_KEY no configurada en el servidor' },
      { status: 500 },
    )
  }

  const { items = [] }: { items: ClassifyItem[] } = await req.json()
  if (!items.length) return NextResponse.json([])

  const categories = VALID_CATEGORIES
  const catLower   = new Map(categories.map(c => [c.toLowerCase(), c]))

  // Dividir en lotes
  const batches: ClassifyItem[][] = []
  for (let i = 0; i < items.length; i += BATCH_SIZE) batches.push(items.slice(i, i + BATCH_SIZE))

  console.log(`[classify] ${items.length} ítems → ${batches.length} lote(s) · modelo: ${MODEL}`)

  const results: ClassifyResult[] = []

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b]
    console.log(`[classify] Lote ${b + 1}/${batches.length} (${batch.length} ítems)…`)

    const batchResults = await callGroqBatch(batch, apiKey, categories, catLower)
    results.push(...batchResults)

    if (b < batches.length - 1) {
      console.log(`[classify] Pausa ${BATCH_DELAY} ms…`)
      await sleep(BATCH_DELAY)
    }
  }

  const failedCount = results.filter(r => r.failed).length
  if (failedCount > 0) console.warn(`[classify] ${failedCount} ítem(s) no procesados`)

  return NextResponse.json(results)
}
