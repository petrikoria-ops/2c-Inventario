import { getSupabaseServer } from '@/lib/supabase/server'
import TablaMateriales from '@/components/materiales/TablaMateriales'

export const dynamic = 'force-dynamic'

export default async function MaterialesPage() {
  const sb = getSupabaseServer()

  const [
    { data: materiales },
    { data: categorias },
    { data: proveedores },
    { data: proyectos },
  ] = await Promise.all([
    sb.from('materiales')
      .select('*,categorias(id,nombre,color),proveedores(id,nombre)')
      .eq('activo', true)
      .order('codigo'),
    sb.from('categorias').select('*').order('nombre'),
    sb.from('proveedores').select('id,nombre').eq('activo', true).order('nombre'),
    sb.from('proyectos').select('id,ot,nombre,estado').in('estado', ['en_proceso','presupuesto']).order('ot'),
  ])

  return (
    <div className="p-5">
      <TablaMateriales
        initialData={materiales ?? []}
        categorias={categorias ?? []}
        proveedores={proveedores ?? []}
        proyectos={proyectos ?? []}
      />
    </div>
  )
}
