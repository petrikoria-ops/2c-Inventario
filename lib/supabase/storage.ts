// Storage de evidencia fotográfica — Verificación RIC y Prevención de
// Riesgos. Cada módulo tiene su propio bucket privado (creados en sus
// respectivas migraciones). `foto_url` en las tablas de ítems guarda el
// PATH del objeto, nunca una URL firmada — las firmadas expiran, el
// path no.
import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET_RIC = 'verificaciones-ric'
const BUCKET_PREVENCION = 'prevencion-riesgos'

export async function subirFotoVerificacion(
  sb: SupabaseClient, verificacionId: number, itemId: number, file: File
): Promise<string> {
  return subirFoto(sb, BUCKET_RIC, `${verificacionId}/${itemId}`, file)
}

export async function subirFotoHallazgoPrevencion(
  sb: SupabaseClient, inspeccionId: number, itemId: number, file: File
): Promise<string> {
  return subirFoto(sb, BUCKET_PREVENCION, `${inspeccionId}/${itemId}`, file)
}

async function subirFoto(sb: SupabaseClient, bucket: string, pathSinExtension: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${pathSinExtension}.${ext}`
  const { error } = await sb.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  })
  if (error) throw error
  return path
}

export async function getSignedUrl(sb: SupabaseClient, path: string, expiresIn = 3600): Promise<string | null> {
  const { data } = await sb.storage.from(BUCKET_RIC).createSignedUrl(path, expiresIn)
  return data?.signedUrl ?? null
}

export async function getSignedUrls(sb: SupabaseClient, paths: string[], expiresIn = 3600): Promise<Record<string, string>> {
  if (!paths.length) return {}
  const { data } = await sb.storage.from(BUCKET_RIC).createSignedUrls(paths, expiresIn)
  const map: Record<string, string> = {}
  data?.forEach(d => { if (d.signedUrl && d.path) map[d.path] = d.signedUrl })
  return map
}

export async function getSignedUrlPrevencion(sb: SupabaseClient, path: string, expiresIn = 3600): Promise<string | null> {
  const { data } = await sb.storage.from(BUCKET_PREVENCION).createSignedUrl(path, expiresIn)
  return data?.signedUrl ?? null
}
