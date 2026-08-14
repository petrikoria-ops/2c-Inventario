import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, esJefeDeBodegaOGerencia } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

// Aprobar/rechazar es lo único que se puede hacer sobre una solicitud ya
// creada (no hay edición de campos sueltos) — y exige
// esJefeDeBodegaOGerencia(), no el `modificar` genérico del módulo.
// Aprobar dispara el mismo cálculo de stock que /api/movimientos
// (tipo='ajuste': `cantidad_reportada` es el nuevo stock total, no un
// delta) para no duplicar la única fuente de verdad de "cómo se mueve
// stock_actual" — ver la decisión "Stock: solo /api/movimientos" en
// CLAUDE.md.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const perfil = await getPerfil()
  if (!esJefeDeBodegaOGerencia(perfil)) {
    return NextResponse.json({ error: 'Solo el Encargado de bodega o Gerencia puede aprobar o rechazar un ajuste.' }, { status: 403 })
  }

  const { estado } = await req.json()
  if (estado !== 'aprobado' && estado !== 'rechazado') {
    return NextResponse.json({ error: 'estado debe ser "aprobado" o "rechazado"' }, { status: 400 })
  }

  const sb = getSupabaseServer()
  const { data: solicitud, error: errSol } = await sb
    .from('solicitudes_ajuste_inventario')
    .select('*')
    .eq('id', params.id)
    .single()

  if (errSol || !solicitud) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  if (solicitud.estado !== 'pendiente') {
    return NextResponse.json({ error: `Esta solicitud ya fue ${solicitud.estado}` }, { status: 409 })
  }

  let movimientoId: number | null = null

  if (estado === 'aprobado') {
    const { data: mat, error: matErr } = await sb
      .from('materiales')
      .select('stock_actual,precio_unitario')
      .eq('id', solicitud.material_id)
      .single()
    if (matErr || !mat) return NextResponse.json({ error: 'El material de esta solicitud ya no existe' }, { status: 404 })

    const stockAntes = mat.stock_actual
    const stockDespues = solicitud.cantidad_reportada // ajuste: cantidad = nuevo stock total, igual que /api/movimientos

    const { data: mov, error: movErr } = await sb
      .from('movimientos')
      .insert({
        material_id: solicitud.material_id,
        tipo: 'ajuste',
        cantidad: Math.abs(stockDespues - stockAntes),
        stock_antes: stockAntes,
        stock_despues: stockDespues,
        usuario: perfil?.nombre_completo ?? 'admin',
        motivo: `Ajuste aprobado (${solicitud.numero}): ${solicitud.motivo}`,
        precio_unit: mat.precio_unitario,
        notas: solicitud.observaciones,
      })
      .select()
      .single()

    if (movErr) return NextResponse.json({ error: movErr.message }, { status: 500 })

    const { error: updErr } = await sb.from('materiales').update({ stock_actual: stockDespues }).eq('id', solicitud.material_id)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    movimientoId = mov.id
  }

  const { data, error } = await sb
    .from('solicitudes_ajuste_inventario')
    .update({
      estado,
      aprobado_por: perfil?.id ?? null,
      aprobado_por_nombre: perfil?.nombre_completo ?? null,
      aprobado_en: new Date().toISOString(),
      movimiento_id: movimientoId,
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
