// Matching asistido por IA para ítems de una solicitud que no calzaron por
// código ni por descripción exacta (redacción distinta, abreviaturas, etc.).
// Mismo patrón que /api/importar/classify: Groq, opcional, nunca bloquea.

const MODEL         = 'llama-3.1-8b-instant'
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const BATCH_SIZE     = 10  // ítems por llamada a Groq
const MAX_CANDIDATOS = 8   // opciones que se le muestran a la IA por ítem
const MAX_RETRIES    = 3
const RETRY_BASE_MS  = 2000

export interface Candidato { id: number; codigo: string; descripcion: string }

const normWord = (s: string) => String(s ?? '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

function tokenize(s: string): Set<string> {
  return new Set(normWord(s).split(/[^A-Z0-9]+/).filter(t => t.length > 2))
}

// Pre-filtro barato: candidatos que comparten al menos una palabra con la
// descripción pedida. Evita mandarle todo el catálogo a la IA (costo y
// límite de tokens) y evita gastar una llamada cuando no hay nada parecido.
export function candidatosPorSolapamiento(
  descripcion: string,
  materiales: Candidato[],
  max = MAX_CANDIDATOS,
): Candidato[] {
  const tokens = tokenize(descripcion)
  if (tokens.size === 0) return []
  return materiales
    .map(m => {
      const mTokens = tokenize(m.descripcion)
      let overlap = 0
      Array.from(tokens).forEach(t => { if (mTokens.has(t)) overlap++ })
      return { m, overlap }
    })
    .filter(x => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, max)
    .map(x => x.m)
}

interface ItemConCandidatos { idx: number; descripcion: string; candidatos: Candidato[] }

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

function buildMessages(batch: ItemConCandidatos[]) {
  const body = batch.map(b =>
    `rowIdx ${b.idx}: "${b.descripcion}"\nOpciones:\n` +
    b.candidatos.map(c => `  - ${c.codigo}: ${c.descripcion}`).join('\n')
  ).join('\n\n')

  return [
    {
      role: 'system' as const,
      content:
        'Eres un experto en inventario de materiales eléctricos industriales. Para cada ítem ' +
        'pedido, evalúa si alguna de sus opciones es REALMENTE el mismo material (aunque esté ' +
        'escrito distinto, con abreviaturas, plural/singular o distinto orden de palabras). ' +
        'Si ninguna opción es con certeza el mismo material, responde null — es mejor no asociar ' +
        'que asociar mal. Responde SIEMPRE con un JSON array válido, sin texto adicional.',
    },
    {
      role: 'user' as const,
      content:
        `Para cada ítem, elige el código de la opción que es el mismo material, o null si ninguna lo es.\n\n` +
        `Formato de respuesta — JSON array de ${batch.length} objetos:\n` +
        `[{"rowIdx":<número>,"codigo":"<código elegido o null>"}]\n\n${body}`,
    },
  ]
}

async function callGroqBatch(batch: ItemConCandidatos[], apiKey: string): Promise<Map<number, string | null>> {
  const result = new Map<number, string | null>()
  const messages = buildMessages(batch)

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let res: Response
    try {
      res = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: MODEL, messages, temperature: 0.1, max_tokens: 800,
          response_format: { type: 'json_object' },
        }),
      })
    } catch (e: any) {
      console.error('[solicitudes/aiMatch] error de red al llamar a Groq:', e.message)
      return result
    }

    if (res.status === 429) {
      if (attempt < MAX_RETRIES) { await sleep(RETRY_BASE_MS * attempt); continue }
      console.warn('[solicitudes/aiMatch] Groq 429 tras reintentos, se deja sin sugerencia')
      return result
    }
    if (!res.ok) {
      console.error(`[solicitudes/aiMatch] Groq error ${res.status}`)
      return result
    }

    const data = await res.json().catch(() => null) as any
    const raw  = data?.choices?.[0]?.message?.content ?? '[]'
    try {
      let parsed: any = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        // response_format:json_object obliga a un objeto en la raíz: con un
        // solo ítem en el lote, Groq a veces devuelve {"rowIdx":0,"codigo":...}
        // directo en vez de envolverlo en un array.
        if (parsed && typeof parsed === 'object' && 'rowIdx' in parsed) {
          parsed = [parsed]
        } else {
          parsed = Object.values(parsed ?? {}).find((v: any) => Array.isArray(v)) ?? []
        }
      }
      for (const r of parsed as any[]) {
        if (r && typeof r.rowIdx === 'number') result.set(r.rowIdx, r.codigo ? String(r.codigo) : null)
      }
    } catch {
      console.error('[solicitudes/aiMatch] respuesta no parseable de Groq:', String(raw).slice(0, 300))
    }
    return result
  }
  return result
}

// Devuelve, por índice de ítem, el código elegido por la IA (o null si no
// encontró un match confiable). Solo consulta a la IA para ítems que ya
// tienen al menos un candidato por solapamiento de palabras.
export async function aiMatchUnmatched(
  items: ItemConCandidatos[],
  apiKey: string,
): Promise<Map<number, string | null>> {
  const conCandidatos = items.filter(i => i.candidatos.length > 0)
  const result = new Map<number, string | null>()
  for (let i = 0; i < conCandidatos.length; i += BATCH_SIZE) {
    const batch = conCandidatos.slice(i, i + BATCH_SIZE)
    const r = await callGroqBatch(batch, apiKey)
    r.forEach((v, k) => result.set(k, v))
  }
  return result
}
