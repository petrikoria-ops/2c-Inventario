import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sb = getSupabaseServer()
  const { data } = await sb
    .from('materiales')
    .select('codigo,descripcion,categorias(nombre),unidad,stock_actual,stock_minimo,ubicacion,precio_unitario,proveedores(nombre),notas')
    .eq('activo', true)
    .order('codigo')

  const cols = ['codigo','descripcion','categoria','unidad','stock_actual','stock_minimo','ubicacion','precio_unitario','valor_total','proveedor','notas']
  const rows = (data ?? []).map(m => [
    m.codigo, m.descripcion, (m.categorias as any)?.nombre ?? '',
    m.unidad, m.stock_actual, m.stock_minimo, m.ubicacion ?? '',
    m.precio_unitario, (m.stock_actual * m.precio_unitario).toFixed(0),
    (m.proveedores as any)?.nombre ?? '', m.notas ?? '',
  ])

  const csv = '﻿' + [cols, ...rows].map(r => r.join(';')).join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="materiales_2c.csv"',
    },
  })
}
