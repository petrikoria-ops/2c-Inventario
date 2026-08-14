import { getSupabaseServer } from '@/lib/supabase/server'
import ListaConectados from './ListaConectados'
import type { PerfilDirectorio } from '@/types'

// Server Component: trae el directorio vía la función SECURITY DEFINER
// perfiles_directorio() (perfiles no deja SELECT de filas ajenas por RLS
// salvo admin — ver migration_mensajeria.sql). El estado "conectado ahora"
// se resuelve en el cliente, vía PresenceContext.
export default async function PanelConectados() {
  const sb = getSupabaseServer()
  const { data } = await sb.rpc('perfiles_directorio')
  const personas: PerfilDirectorio[] = data ?? []
  if (!personas.length) return null
  return <ListaConectados personas={personas} />
}
