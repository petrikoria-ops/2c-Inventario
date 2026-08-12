import { redirect } from 'next/navigation'
import ImportarMateriales from '@/components/importar/ImportarMateriales'
import { getPerfil, puedeEditar } from '@/lib/auth/permisos.server'

export const metadata = { title: 'Importar materiales — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function ImportarPage() {
  const perfil = await getPerfil()
  if (!perfil || !(puedeEditar(perfil, 'materiales') || puedeEditar(perfil, 'herramientas'))) redirect('/')

  return <ImportarMateriales />
}
