import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getSignedUrlDeBucket } from '@/lib/supabase/storage'
import { CONFIG_MODULOS_PUBLICOS, esModuloPublico } from '@/lib/enlacesPublicos/modulos'
import FormularioPublico from '@/components/enlacesPublicos/FormularioPublico'
import EnlaceNoDisponible from '@/components/enlacesPublicos/EnlaceNoDisponible'
import type { ModuloPublico } from '@/types'

export const dynamic = 'force-dynamic'

export default async function CompletarPage({ params }: { params: { token: string } }) {
  const sb = getSupabaseAdmin()
  const { data: enlace } = await sb.from('enlaces_publicos').select('*').eq('token', params.token).maybeSingle()

  if (!enlace || !esModuloPublico(enlace.modulo)) notFound()
  if (!enlace.activo) return <EnlaceNoDisponible motivo="revocado" />
  if (new Date(enlace.expira_en) < new Date()) return <EnlaceNoDisponible motivo="vencido" />

  const modulo = enlace.modulo as ModuloPublico
  const config = CONFIG_MODULOS_PUBLICOS[modulo]
  const { data: cabecera } = await sb.from(config.tabla).select('*').eq('id', enlace.registro_id).maybeSingle()
  if (!cabecera) notFound()

  let items: Record<string, any>[] = []
  let alimentadores: (Record<string, any> & { items: Record<string, any>[] })[] = []

  if (modulo === 'pruebas_alimentadores') {
    const [{ data: alims }, { data: todosLosItems }] = await Promise.all([
      sb.from('pruebas_alimentadores_alimentadores').select('*').eq('prueba_id', enlace.registro_id).order('orden'),
      sb.from(config.tablaItems).select('*').eq(config.fkItems, enlace.registro_id).order('orden'),
    ])
    alimentadores = (alims ?? []).map(a => ({
      ...a,
      items: (todosLosItems ?? []).filter(i => i.alimentador_id === a.id),
    }))
  } else {
    const { data } = await sb.from(config.tablaItems).select('*').eq(config.fkItems, enlace.registro_id).order('orden')
    items = data ?? []
  }

  // Resuelve URLs firmadas para las fotos/firmas ya guardadas — foto_url en
  // BD siempre guarda el path, nunca la URL firmada (expira).
  const paths = new Set<string>()
  items.forEach(i => { if (i.foto_url) paths.add(i.foto_url) })
  alimentadores.forEach(a => a.items.forEach(i => { if (i.foto_url) paths.add(i.foto_url) }))
  for (const campo of config.camposCabeceraEditables) {
    if (campo.endsWith('_imagen_url') && cabecera[campo]) paths.add(cabecera[campo])
  }
  const fotosFirmadas: Record<string, string> = {}
  await Promise.all(Array.from(paths).map(async path => {
    const url = await getSignedUrlDeBucket(sb, config.bucket, path)
    if (url) fotosFirmadas[path] = url
  }))

  return (
    <FormularioPublico
      token={params.token}
      modulo={modulo}
      cabeceraInicial={cabecera}
      itemsIniciales={items}
      alimentadoresIniciales={alimentadores}
      fotosFirmadas={fotosFirmadas}
      yaCompletado={!!enlace.completado_en}
      completadoPorNombre={enlace.completado_por_nombre}
      completadoPorRut={enlace.completado_por_rut}
    />
  )
}
