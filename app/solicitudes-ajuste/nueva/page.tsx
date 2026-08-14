import { redirect } from 'next/navigation'
import NuevaSolicitudAjuste from '@/components/ajusteInventario/NuevaSolicitudAjuste'
import { getPerfil, puedeCrear } from '@/lib/auth/permisos.server'

export const metadata = { title: 'Nueva solicitud de ajuste — 2C Inventario' }

export default async function NuevaSolicitudAjustePage() {
  const perfil = await getPerfil()
  if (perfil && !puedeCrear(perfil, 'solicitudes_ajuste')) redirect('/solicitudes-ajuste')

  return <NuevaSolicitudAjuste />
}
