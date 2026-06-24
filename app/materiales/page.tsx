import { getSupabaseServer } from '@/lib/supabase/server'
import TablaMateriales from '@/components/materiales/TablaMateriales'
import { AlertTriangle } from 'lucide-react'
import type { Material } from '@/types'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 1000

// PostgREST aplica un tope implícito de filas por consulta; sin paginar,
// el inventario se trunca en silencio al superarlo. Con catálogos grandes
// (2000+ filas) pedir las páginas en paralelo en vez de una por una corta
// el tiempo de carga de N round-trips secuenciales a ~1.
async function fetchAllMateriales(sb: ReturnType<typeof getSupabaseServer>) {
  const base = () => sb.from('materiales').select('*,categorias(id,nombre,color),proveedores(id,nombre)').eq('activo', true)

  const { count, error: countErr } = await sb
    .from('materiales')
    .select('id', { count: 'exact', head: true })
    .eq('activo', true)
  if (countErr) return { rows: null, error: countErr }

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))
  const pageFetches = Array.from({ length: totalPages }, (_, i) => {
    const from = i * PAGE_SIZE
    return base().order('codigo').range(from, from + PAGE_SIZE - 1)
  })

  const results = await Promise.all(pageFetches)
  const firstError = results.find(r => r.error)?.error
  if (firstError) return { rows: null, error: firstError }

  const rows = results.flatMap(r => r.data ?? []) as unknown as Material[]
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
