// Storage de evidencia fotográfica — Verificación RIC.
// Bucket privado "verificaciones-ric" (creado en
// supabase/migration_avance_obra_y_verificacion_ric.sql). `foto_url` en
// verificaciones_ric_items guarda el PATH del objeto, nunca una URL
// firmada — las firmadas expiran, el path no.
import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'verificaciones-ric'

export async function subirFotoVerificacion(
  sb: SupabaseClient, verificacionId: number, itemId: number, file: File
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${verificacionId}/${itemId}.${ext}`
  const { error } = await sb.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  })
  if (error) throw error
  return path
}

export async function getSignedUrl(sb: SupabaseClient, path: string, expiresIn = 3600): Promise<string | null> {
  const { data } = await sb.storage.from(BUCKET).createSignedUrl(path, expiresIn)
  return data?.signedUrl ?? null
}

export async function getSignedUrls(sb: SupabaseClient, paths: string[], expiresIn = 3600): Promise<Record<string, string>> {
  if (!paths.length) return {}
  const { data } = await sb.storage.from(BUCKET).createSignedUrls(paths, expiresIn)
  const map: Record<string, string> = {}
  data?.forEach(d => { if (d.signedUrl && d.path) map[d.path] = d.signedUrl })
  return map
}
