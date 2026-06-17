import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

// POST /api/herramientas/entregar
// Body: { herramientas: [{id, codigo, descripcion, notas?}], trabajador_id, trabajador_nombre, usuario, observaciones }
// Efecto: crea entrega, actualiza responsable en cada herramienta

export async function POST(req: NextRequest) {
  const sb = getSupabaseServer()
  const { herramientas, trabajador_id, trabajador_nombre, usuario, observaciones } = await req.json()

  if (!herramientas?.length)       return NextResponse.json({ error: 'Sin herramientas' }, { status: 400 })
  if (!trabajador_nombre?.trim())  return NextResponse.json({ error: 'Trabajador requerido' }, { status: 400 })

  // Generar número EH-YYYY-NNN
  const year = new Date().getFullYear()
  const { data: last } = await sb
    .from('entregas_herramientas')
    .select('numero')
    .like('numero', `EH-${year}-%`)
    .order('numero', { ascending: false })
    .limit(1)
  const lastSeq = last?.[0]?.numero ? parseInt(last[0].numero.split('-')[2] ?? '0', 10) : 0
  const numero  = `EH-${year}-${String(lastSeq + 1).padStart(3, '0')}`

  // Crear registro de entrega
  const { data: entrega, error: entregaErr } = await sb
    .from('entregas_herramientas')
    .insert({
      numero,
      trabajador_id:    trabajador_id || null,
      trabajador_nombre: trabajador_nombre.trim(),
      usuario:          usuario || 'admin',
      observaciones:    observaciones || null,
    })
    .select()
    .single()

  if (entregaErr) return NextResponse.json({ error: entregaErr.message }, { status: 500 })

  // Insertar ítems
  const itemsRows = herramientas.map((h: any) => ({
    entrega_id:    entrega.id,
    herramienta_id: h.id,
    codigo:        h.codigo,
    descripcion:   h.descripcion,
    notas:         h.notas || null,
  }))
  const { error: itemsErr } = await sb.from('entregas_herramientas_items').insert(itemsRows)
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  // Actualizar responsable en cada herramienta
  const herramientaIds: number[] = herramientas.map((h: any) => h.id)
  const { error: updErr } = await sb
    .from('herramientas')
    .update({ responsable: trabajador_nombre.trim() })
    .in('id', herramientaIds)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({ id: entrega.id, numero }, { status: 201 })
}
