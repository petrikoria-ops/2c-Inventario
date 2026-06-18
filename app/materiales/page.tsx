import { getSupabaseServer } from '@/lib/supabase/server'
import TablaMateriales from '@/components/materiales/TablaMateriales'
import { AlertTriangle } from 'lucide-react'
import type { Material } from '@/types'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 1000

// PostgREST aplica un tope implícito de filas por consulta; sin paginar,
// el inventario se trunca en silencio al superarlo.
async function fetchAllMateriales(sb: ReturnType<typeof getSupabaseServer>) {
  const rows: Material[] = []
  let from = 0
  while (true) {
    const { data, error } = await sb
      .from('materiales')
      .select('*,categorias(id,nombre,color),proveedores(id,nombre)')
      .eq('activo', true)
      .order('codigo')
      .range(from, from + PAGE_SIZE - 1)
    if (error) return { rows: null, error }
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return { rows, error: null as null | { message: string } }
}

export default async function MaterialesPage() {
  const sb = getSupabaseServer()

  const [
    materialesRes,
    { data: categorias },
    { data: proveedores },
    { data: proyectos },
  ] = await Promise.all([
    fetchAllMateriales(sb),
    sb.from('categorias').select('*').order('nombre'),
    sb.from('proveedores').select('id,nombre').eq('activo', true).order('nombre'),
    sb.from('proyectos').select('id,ot,nombre,estado').in('estado', ['en_proceso','presupuesto']).order('ot'),
  ])

  return (
    <div className="p-5">
      {materialesRes.error && (
        <div className="alert alert-red mb-4">
          <AlertTriangle size={15} />
          No se pudo cargar el inventario ({materialesRes.error.message}). Recarga la página o avisa a soporte.
        </div>
      )}
      <TablaMateriales
        initialData={materialesRes.rows ?? []}
        categorias={categorias ?? []}
        proveedores={proveedores ?? []}
        proyectos={proyectos ?? []}
      />
    </div>
  )
}
