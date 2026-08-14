import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/auth/permisos.server'
import Inbox from '@/components/mensajeria/Inbox'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mensajes — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function MensajesPage() {
  const perfil = await getPerfil()
  if (!perfil) redirect('/login')

  const sb = getSupabaseServer()
  const [{ data: directorio }, { data: mensajes }] = await Promise.all([
    sb.rpc('perfiles_directorio'),
    sb.from('mensajes')
      .select('*')
      .or(`remitente_id.eq.${perfil.id},destinatario_id.eq.${perfil.id}`)
      .order('creado_en', { ascending: false }),
  ])

  return (
    <Suspense fallback={null}>
      <Inbox miId={perfil.id} directorio={directorio ?? []} mensajesIniciales={mensajes ?? []} />
    </Suspense>
  )
}
