import { getSupabaseServer } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST /api/materiales/check
// Body: { codigos: string[] }
// Returns: { existing: string[] }
export async function POST(req: Request) {
  const { codigos } = await req.json()
  if (!Array.isArray(codigos) || codigos.length === 0) {
    return NextResponse.json({ existing: [] })
  }

  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('materiales')
    .select('codigo')
    .in('codigo', codigos)
    .eq('activo', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ existing: (data ?? []).map((r: any) => r.codigo) })
}
