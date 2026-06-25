import { redirect } from 'next/navigation'
import NuevaSolicitud from '@/components/solicitudes/NuevaSolicitud'
import { getPerfil, puedeEditar } from '@/lib/auth/permisos.server'

export const metadata = { title: 'Nueva solicitud de compra — 2C Inventario' }

export default async function NuevaSolicitudPage() {
  const perfil = await getPerfil()
  if (perfil && !puedeEditar(perfil, 'compras')) redirect('/solicitudes')

  return <NuevaSolicitud />
}
