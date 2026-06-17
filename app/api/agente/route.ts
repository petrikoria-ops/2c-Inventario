import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL         = 'llama-3.1-8b-instant'

// ── Intent detection ──────────────────────────────────────────────
type IntentType =
  | 'stock_bajo' | 'sin_stock' | 'her_reparacion'
  | 'movimientos' | 'proyectos' | 'resumen'
  | 'her_responsable' | 'buscar_herramienta' | 'buscar_material'
  | 'desconocido'

interface Intent { type: IntentType; q?: string; nombre?: string }

function detectIntent(text: string): Intent {
  const l = text.toLowerCase()

  if (/bajo\s+stock|bajo\s+m[ií]nimo|alert|escas|poco\s+stock|reponer|cr[ií]tic/.test(l))
    return { type: 'stock_bajo' }

  if (/sin\s+stock|agotado|stock\s*0|sin\s+existencia/.test(l))
    return { type: 'sin_stock' }

  if (/en\s+reparaci[oó]n|reparaci[oó]n|averiad|dañad/.test(l))
    return { type: 'her_reparacion' }

  if (/[uú]ltimos?\s+movimientos?|historial\s+de\s+movimientos?|movimientos?\s+recientes?/.test(l))
    return { type: 'movimientos' }

  if (/proyectos?\s+activos?|obras?\s+activas?|en\s+proceso|obras?\s+en/.test(l))
    return { type: 'proyectos' }

  if (/resumen|cu[aá]ntos?\s+(materiales?|herramientas?|[ií]tems?)|valor\s+total|inventario\s+total|estad[ií]stic/.test(l))
    return { type: 'resumen' }

  // Herramientas de alguien: "herramientas de Juan", "qué tiene Pedro", "equipos de María"
  const herResp =
    l.match(/(?:herramientas?|equipos?)\s+(?:de|que\s+tiene|asignadas?\s+a)\s+([a-záéíóúñ\s]+?)(?:\?|$)/i) ||
    l.match(/(?:tiene|le\s+pertenece[n]?)\s+([a-záéíóúñ\s]+?)\s+(?:herramientas?|equipos?)(?:\?|$)/i)
  if (herResp) return { type: 'her_responsable', nombre: herResp[1].trim() }

  // Buscar herramienta
  if (/herramienta|equipo\b/.test(l)) {
    const terms = text
      .replace(/[¿?]/g, '')
      .replace(/\b(?:busca|buscar|hay|tiene|existe|tenemos?|cuál|qué|las?|los?|una?|herramienta|equipo|s|de)\b/gi, ' ')
      .replace(/\s+/g, ' ').trim()
    return { type: 'buscar_herramienta', q: terms.length >= 2 ? terms : l }
  }

  // Default: buscar material por texto
  const terms = text
    .replace(/[¿?]/g, '')
    .replace(/\b(?:busca|buscar|hay|existe|tenemos?|cuál|qué|tienes?|material|materiales?|hay|una?)\b/gi, ' ')
    .replace(/\s+/g, ' ').trim()
  if (terms.length >= 2) return { type: 'buscar_material', q: terms }

  return { type: 'desconocido' }
}

// ── Supabase queries ──────────────────────────────────────────────
interface QueryResult {
  rows:     Record<string, unknown>[]
  columnas: string[]
  titulo:   string
  empty:    string   // message when no rows
}

async function runQuery(intent: Intent): Promise<QueryResult> {
  const sb = getSupabaseServer()

  switch (intent.type) {
    case 'stock_bajo': {
      const { data } = await sb.from('materiales')
        .select('codigo,descripcion,stock_actual,stock_minimo,unidad,ubicacion')
        .eq('activo', true).order('stock_actual', { ascending: true }).limit(200)
      const rows = (data ?? []).filter((m: any) => m.stock_actual <= m.stock_minimo)
        .slice(0, 25)
        .map((m: any) => ({ Código: m.codigo, Descripción: m.descripcion, Stock: m.stock_actual, Mínimo: m.stock_minimo, Un: m.unidad, Ubicación: m.ubicacion ?? '—' }))
      return { rows, columnas: ['Código', 'Descripción', 'Stock', 'Mínimo', 'Un', 'Ubicación'], titulo: 'Materiales bajo stock mínimo', empty: 'No hay materiales bajo el stock mínimo. ¡Inventario en orden!' }
    }

    case 'sin_stock': {
      const { data } = await sb.from('materiales')
        .select('codigo,descripcion,stock_actual,unidad,ubicacion')
        .eq('activo', true).eq('stock_actual', 0).order('codigo').limit(30)
      const rows = (data ?? []).map((m: any) => ({ Código: m.codigo, Descripción: m.descripcion, Un: m.unidad, Ubicación: m.ubicacion ?? '—' }))
      return { rows, columnas: ['Código', 'Descripción', 'Un', 'Ubicación'], titulo: 'Materiales sin stock', empty: 'No hay materiales con stock = 0.' }
    }

    case 'her_reparacion': {
      const { data } = await sb.from('herramientas')
        .select('codigo,descripcion,marca,modelo,responsable,ubicacion')
        .eq('activo', true).eq('estado', 'en_reparacion').order('codigo')
      const rows = (data ?? []).map((h: any) => ({
        Código: h.codigo, Descripción: h.descripcion,
        'Marca/Modelo': [h.marca, h.modelo].filter(Boolean).join(' ') || '—',
        Responsable: h.responsable ?? '—', Ubicación: h.ubicacion ?? '—',
      }))
      return { rows, columnas: ['Código', 'Descripción', 'Marca/Modelo', 'Responsable', 'Ubicación'], titulo: 'Herramientas en reparación', empty: 'No hay herramientas en reparación actualmente.' }
    }

    case 'movimientos': {
      const { data } = await sb.from('movimientos')
        .select('tipo,cantidad,motivo,usuario,fecha,stock_despues,materiales(codigo,descripcion,unidad)')
        .order('fecha', { ascending: false }).limit(15)
      const rows = (data ?? []).map((m: any) => ({
        Fecha: new Date(m.fecha).toLocaleDateString('es-CL'),
        Tipo: m.tipo, Cantidad: m.cantidad,
        Material: `${m.materiales?.codigo} — ${m.materiales?.descripcion}`,
        'Stock resultante': `${m.stock_despues} ${m.materiales?.unidad ?? ''}`,
        Usuario: m.usuario, Motivo: m.motivo ?? '—',
      }))
      return { rows, columnas: ['Fecha', 'Tipo', 'Cantidad', 'Material', 'Stock resultante', 'Usuario', 'Motivo'], titulo: 'Últimos 15 movimientos', empty: 'No hay movimientos registrados.' }
    }

    case 'proyectos': {
      const { data } = await sb.from('proyectos')
        .select('ot,nombre,cliente,estado,fecha_inicio,fecha_entrega')
        .eq('estado', 'en_proceso').order('ot', { ascending: false })
      const rows = (data ?? []).map((p: any) => ({
        OT: p.ot, Nombre: p.nombre, Cliente: p.cliente ?? '—',
        'Fecha inicio': p.fecha_inicio ?? '—',
        'Entrega estimada': p.fecha_entrega ?? '—',
      }))
      return { rows, columnas: ['OT', 'Nombre', 'Cliente', 'Fecha inicio', 'Entrega estimada'], titulo: 'Proyectos en proceso', empty: 'No hay proyectos activos actualmente.' }
    }

    case 'resumen': {
      const [matsRes, herRes, provRes] = await Promise.all([
        sb.from('materiales').select('stock_actual,stock_minimo,precio_unitario').eq('activo', true),
        sb.from('herramientas').select('estado').eq('activo', true),
        sb.from('proyectos').select('id').eq('estado', 'en_proceso'),
      ])
      const mats     = matsRes.data ?? []
      const hers     = herRes.data ?? []
      const alertas  = mats.filter((m: any) => m.stock_actual <= m.stock_minimo).length
      const valorTotal = mats.reduce((s: number, m: any) => s + (m.stock_actual * (m.precio_unitario ?? 0)), 0)
      const enRepar  = hers.filter((h: any) => h.estado === 'en_reparacion').length
      const rows = [
        { Métrica: 'Total materiales activos',     Valor: mats.length },
        { Métrica: 'Materiales bajo stock mínimo', Valor: alertas },
        { Métrica: 'Valor estimado inventario',    Valor: valorTotal.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }) },
        { Métrica: 'Herramientas activas',         Valor: hers.length },
        { Métrica: 'Herramientas en reparación',   Valor: enRepar },
        { Métrica: 'Proyectos activos',            Valor: provRes.data?.length ?? 0 },
      ]
      return { rows, columnas: ['Métrica', 'Valor'], titulo: 'Resumen del inventario', empty: '' }
    }

    case 'her_responsable': {
      const nombre = intent.nombre ?? ''
      const { data } = await sb.from('herramientas')
        .select('codigo,descripcion,marca,modelo,estado,ubicacion')
        .eq('activo', true)
        .ilike('responsable', `%${nombre}%`)
        .order('codigo')
      const rows = (data ?? []).map((h: any) => ({
        Código: h.codigo, Descripción: h.descripcion,
        'Marca/Modelo': [h.marca, h.modelo].filter(Boolean).join(' ') || '—',
        Estado: h.estado.replace('_', ' '), Ubicación: h.ubicacion ?? '—',
      }))
      return { rows, columnas: ['Código', 'Descripción', 'Marca/Modelo', 'Estado', 'Ubicación'], titulo: `Herramientas de "${nombre}"`, empty: `No se encontraron herramientas asignadas a "${nombre}".` }
    }

    case 'buscar_herramienta': {
      const q = intent.q ?? ''
      const { data } = await sb.from('herramientas')
        .select('codigo,descripcion,marca,modelo,estado,responsable,ubicacion')
        .eq('activo', true)
        .or(`codigo.ilike.%${q}%,descripcion.ilike.%${q}%`)
        .order('codigo').limit(15)
      const rows = (data ?? []).map((h: any) => ({
        Código: h.codigo, Descripción: h.descripcion,
        Estado: h.estado.replace('_', ' '),
        Responsable: h.responsable ?? '—', Ubicación: h.ubicacion ?? '—',
      }))
      return { rows, columnas: ['Código', 'Descripción', 'Estado', 'Responsable', 'Ubicación'], titulo: `Herramientas: "${q}"`, empty: `No se encontraron herramientas para "${q}".` }
    }

    case 'buscar_material': {
      const q = intent.q ?? ''
      const { data } = await sb.from('materiales')
        .select('codigo,descripcion,stock_actual,unidad,ubicacion,precio_unitario,categorias(nombre)')
        .eq('activo', true)
        .or(`codigo.ilike.%${q}%,descripcion.ilike.%${q}%`)
        .order('codigo').limit(15)
      const rows = (data ?? []).map((m: any) => ({
        Código: m.codigo, Descripción: m.descripcion,
        Stock: `${m.stock_actual} ${m.unidad}`,
        Categoría: (m.categorias as any)?.nombre ?? '—',
        'P. Unit.': m.precio_unitario
          ? m.precio_unitario.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
          : '—',
        Ubicación: m.ubicacion ?? '—',
      }))
      return { rows, columnas: ['Código', 'Descripción', 'Stock', 'Categoría', 'P. Unit.', 'Ubicación'], titulo: `Materiales: "${q}"`, empty: `No se encontraron materiales para "${q}".` }
    }

    default:
      return { rows: [], columnas: [], titulo: '', empty: '' }
  }
}

// ── Groq response generation ──────────────────────────────────────
async function generarRespuesta(
  pregunta: string,
  intent: Intent,
  result: QueryResult,
  apiKey: string,
): Promise<string> {
  const datosStr = result.rows.length
    ? `Los datos reales obtenidos de la base de datos son:\n${JSON.stringify(result.rows.slice(0, 10), null, 2)}\nTotal de registros: ${result.rows.length}`
    : result.empty

  const messages = [
    {
      role: 'system',
      content:
        'Eres un asistente de inventario para 2C Montajes y Proyectos Eléctricos. ' +
        'Respondes preguntas sobre materiales, herramientas, proyectos y movimientos. ' +
        'SIEMPRE usas ÚNICAMENTE los datos proporcionados — NUNCA inventas información. ' +
        'Responde en español, de forma concisa y directa. ' +
        'Si hay datos, haz un resumen breve (2-3 oraciones); la tabla ya se muestra al usuario. ' +
        'Si no hay datos, explica claramente que no hay registros.',
    },
    {
      role: 'user',
      content: `Pregunta del usuario: "${pregunta}"\n\n${datosStr}`,
    },
  ]

  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method:  'POST',
      headers: { 'content-type': 'application/json', 'authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.3, max_tokens: 300 }),
    })
    if (!res.ok) throw new Error(`Groq ${res.status}`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? fallbackMensaje(intent, result)
  } catch {
    return fallbackMensaje(intent, result)
  }
}

function fallbackMensaje(intent: Intent, result: QueryResult): string {
  if (result.rows.length === 0) return result.empty || 'No se encontraron resultados.'
  return `Se encontraron ${result.rows.length} resultado${result.rows.length !== 1 ? 's' : ''} para "${result.titulo}".`
}

// ── POST handler ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { pregunta } = await req.json()
  if (!pregunta?.trim()) return NextResponse.json({ error: 'Pregunta vacía' }, { status: 400 })

  const intent = detectIntent(pregunta)

  if (intent.type === 'desconocido') {
    return NextResponse.json({
      respuesta: 'No entendí bien la consulta. Puedes preguntarme por materiales bajo stock, herramientas, proyectos activos, o buscar un material por nombre o código.',
      intent:    'desconocido',
      rows:      [],
      columnas:  [],
    })
  }

  const result = await runQuery(intent)

  const apiKey = process.env.GROQ_API_KEY
  const respuesta = apiKey
    ? await generarRespuesta(pregunta, intent, result, apiKey)
    : fallbackMensaje(intent, result)

  return NextResponse.json({
    respuesta,
    intent:   intent.type,
    rows:     result.rows,
    columnas: result.columnas,
    titulo:   result.titulo,
  })
}
