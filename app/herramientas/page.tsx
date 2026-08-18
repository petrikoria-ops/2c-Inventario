import { getSupabaseServer } from '@/lib/supabase/server'
import TablaHerramientas from '@/components/herramientas/TablaHerramientas'
import { AlertTriangle } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getPerfil, puedeVer, puedeEditar } from '@/lib/auth/permisos.server'
import type { Herramienta } from '@/types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Herramientas — 2C Inventario' }
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 1000

// Mismo patrón que app/materiales/page.tsx: PostgREST topa cada consulta en
// db-max-rows (1000 en Supabase) aunque el catálogo tenga más filas — sin
// paginar, el listado se trunca en silencio al superar ese número. Hoy
// herramientas está lejos de 1000 filas, pero es la misma clase de bug que
// ya afectó a materiales cuando creció, así que se deja resuelto de una vez.
async function fetchAllHerramientas(sb: ReturnType<typeof getSupabaseServer>) {
  const base = () => sb.from('herramientas').select('*').eq('activo', true)

  const { count, error: countErr } = await sb
    .from('herramientas')
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

  const rows = results.flatMap(r => r.data ?? []) as unknown as Herramienta[]
  return { rows, error: null as null | { message: string } }
}

export default async function HerramientasPage() {
  const sb = getSupabaseServer()
  const [herramientasRes, perfil] = await Promise.all([
    fetchAllHerramientas(sb),
    getPerfil(),
  ])

  if (perfil && !puedeVer(perfil, 'herramientas')) redirect('/')

  // Sin perfil (no debería pasar, ver middleware) se deja editar como antes.
  const editable = !perfil || puedeEditar(perfil, 'herramientas')

  return (
    <div className="p-5">
      {herramientasRes.error && (
        <div className="alert alert-red mb-4">
          <AlertTriangle size={15} />
          No se pudo cargar el listado de herramientas ({herramientasRes.error.message}). Recarga la página o avisa a soporte.
        </div>
      )}
      <TablaHerramientas initialData={herramientasRes.rows ?? []} editable={editable} />
    </div>
  )
}
