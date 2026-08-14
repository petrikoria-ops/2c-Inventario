import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, puedeEliminar } from '@/lib/auth/permisos.server'
import { grupoDeCategoria, type CategoriaDocumentoTrabajador } from '@/lib/departamentos/documentosTrabajador'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const perfil = await getPerfil()
  const sb = getSupabaseServer()

  const { data: doc, error: errGet } = await sb
    .from('documentos_trabajador')
    .select('categoria,archivo_url')
    .eq('id', params.id)
    .single()
  if (errGet || !doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })

  const grupo = grupoDeCategoria(doc.categoria as CategoriaDocumentoTrabajador)
  if (perfil && !puedeEliminar(perfil, grupo.modulo)) {
    return NextResponse.json({ error: `Tu perfil no tiene permiso para eliminar documentos de "${grupo.titulo}".` }, { status: 403 })
  }

  const { error } = await sb.from('documentos_trabajador').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Best-effort: si falla borrar el archivo del bucket no bloquea la
  // eliminación de la fila (evita dejar la fila "atascada" por un error
  // de Storage transitorio).
  await sb.storage.from('documentos-trabajador').remove([doc.archivo_url]).catch(() => {})

  return NextResponse.json({ ok: true })
}
