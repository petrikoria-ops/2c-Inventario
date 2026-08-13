import { redirect } from 'next/navigation'
import NuevaEntrega from '@/components/entregas/NuevaEntrega'
import { getPerfil, puedeCrear } from '@/lib/auth/permisos.server'

export const metadata = { title: 'Entrega por mano | 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function EntregaNuevaPage() {
  const perfil = await getPerfil()
  if (perfil && !puedeCrear(perfil, 'movimientos')) redirect('/materiales')

  return <NuevaEntrega />
}
