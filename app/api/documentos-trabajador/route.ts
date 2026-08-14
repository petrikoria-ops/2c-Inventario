import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, puedeVer, puedeCrear } from '@/lib/auth/permisos.server'
import { grupoDeCategoria, type CategoriaDocumentoTrabajador } from '@/lib/departamentos/documentosTrabajador'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const perfil = await getPerfil()
  const { searchParams: p } = new URL(req.url)
  const trabajadorId = p.get('trabajador_id')
  if (!trabajadorId) return NextResponse.json({ error: 'trabajador_id es obligatorio' }, { status: 400 })

  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('documentos_trabajador')
    .select('*, proyectos(id,ot,nombre)')
    .eq('trabajador_id', trabajadorId)
    .order('creado_en', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filtra a lo que el perfil puede ver por categoría — un jefe de RRHH
  // sin permiso en prevencion_riesgos no debería ver charla_diaria/EPP de
  // ese mismo trabajador, y viceversa.
  const visibles = (data ?? []).filter(d =>
    !perfil || puedeVer(perfil, grupoDeCategoria(d.categoria as CategoriaDocumentoTrabajador).modulo),
  )
  return NextResponse.json(visibles)
}

export async function POST(req: NextRequest) {
  const perfil = await getPerfil()
  const sb = getSupabaseServer()
  const body = await req.json()

  const categoria = body.categoria as CategoriaDocumentoTrabajador
  const grupo = grupoDeCategoria(categoria)
  if (!grupo) return NextResponse.json({ error: 'categoria inválida' }, { status: 400 })
  if (perfil && !puedeCrear(perfil, grupo.modulo)) {
    return NextResponse.json({ error: `Tu perfil no tiene permiso para subir documentos de "${grupo.titulo}".` }, { status: 403 })
  }

  const { trabajador_id, proyecto_id, titulo, archivo_url, archivo_nombre, fecha_documento, fecha_vencimiento, notas } = body
  if (!trabajador_id) return NextResponse.json({ error: 'trabajador_id es obligatorio' }, { status: 400 })
  if (!titulo?.trim()) return NextResponse.json({ error: 'El título es obligatorio' }, { status: 400 })
  if (!archivo_url)    return NextResponse.json({ error: 'Falta el archivo subido' }, { status: 400 })

  const { data, error } = await sb
    .from('documentos_trabajador')
    .insert({
      trabajador_id,
      proyecto_id: proyecto_id || null,
      categoria,
      titulo: titulo.trim(),
      archivo_url,
      archivo_nombre: archivo_nombre || null,
      fecha_documento: fecha_documento || null,
      fecha_vencimiento: fecha_vencimiento || null,
      notas: notas || null,
      subido_por: perfil?.id ?? null,
      subido_por_nombre: perfil?.nombre_completo ?? 'Sin identificar',
    })
    .select('*, proyectos(id,ot,nombre)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
