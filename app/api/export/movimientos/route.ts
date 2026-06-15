import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer()
  const { searchParams: p } = new URL(req.url)
  const desde = p.get('desde')
  const hasta = p.get('hasta')

  let query = sb.from('movimientos')
    .select('fecha,materiales(codigo,descripcion,unidad),tipo,cantidad,stock_antes,stock_despues,proyectos(ot),usuario,motivo')
    .order('fecha', { ascending: false })
  if (desde) query = query.gte('fecha', desde)
  if (hasta) query = query.lte('fecha', hasta + 'T23:59:59')

  const { data } = await query
  const cols = ['fecha','codigo','descripcion','tipo','cantidad','unidad','stock_antes','stock_despues','proyecto_ot','usuario','motivo']
  const rows = (data ?? []).map(m => [
    m.fecha, (m.materiales as any)?.codigo, (m.materiales as any)?.descripcion,
    m.tipo, m.cantidad, (m.materiales as any)?.unidad,
    m.stock_antes, m.stock_despues, (m.proyectos as any)?.ot ?? '', m.usuario, m.motivo ?? '',
  ])

  const csv = '﻿' + [cols, ...rows].map(r => r.join(';')).join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="movimientos_2c.csv"',
    },
  })
}
