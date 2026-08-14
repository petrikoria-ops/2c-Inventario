// Storage de evidencia fotográfica — Verificación RIC y Prevención de
// Riesgos. Cada módulo tiene su propio bucket privado (creados en sus
// respectivas migraciones). `foto_url` en las tablas de ítems guarda el
// PATH del objeto, nunca una URL firmada — las firmadas expiran, el
// path no.
import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET_RIC = 'verificaciones-ric'
const BUCKET_PREVENCION = 'prevencion-riesgos'
const BUCKET_ALIMENTADORES = 'pruebas-alimentadores'
const BUCKET_DOCUMENTOS_TRABAJADOR = 'documentos-trabajador'

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

export async function subirFotoAlimentador(
  sb: SupabaseClient, pruebaId: number, itemId: number, file: File
): Promise<string> {
  return subirFoto(sb, BUCKET_ALIMENTADORES, `${pruebaId}/${itemId}`, file)
}

// Firma dibujada a mano (PNG del canvas de FirmaCanvas) — mismo criterio que
// las fotos: se guarda el path, nunca una URL firmada. `path` ya incluye el
// id del registro y qué firma es (ej. `12/firma-nombre.png`), lo arma quien
// llama (CampoFirma) porque varía según el módulo.
export async function subirFirma(sb: SupabaseClient, bucket: string, path: string, blob: Blob): Promise<string> {
  const { error } = await sb.storage.from(bucket).upload(path, blob, { upsert: true, contentType: 'image/png' })
  if (error) throw error
  return path
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

// Documentos de trabajador (RRHH/Prevención, ver migration_documentos_trabajador.sql)
// — a diferencia de las fotos, cualquier tipo de archivo (PDF, imagen…),
// así que se preserva el nombre original en el path para que la
// descarga muestre algo legible.
export async function subirDocumentoTrabajador(
  sb: SupabaseClient, trabajadorId: number, file: File
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const path = `${trabajadorId}/${Date.now()}-${safeName}`
  const { error } = await sb.storage.from(BUCKET_DOCUMENTOS_TRABAJADOR).upload(path, file, {
    upsert: false,
    contentType: file.type,
  })
  if (error) throw error
  return path
}

export async function getSignedUrlDocumentoTrabajador(sb: SupabaseClient, path: string, expiresIn = 3600): Promise<string | null> {
  const { data } = await sb.storage.from(BUCKET_DOCUMENTOS_TRABAJADOR).createSignedUrl(path, expiresIn)
  return data?.signedUrl ?? null
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

export async function getSignedUrlsPrevencion(sb: SupabaseClient, paths: string[], expiresIn = 3600): Promise<Record<string, string>> {
  if (!paths.length) return {}
  const { data } = await sb.storage.from(BUCKET_PREVENCION).createSignedUrls(paths, expiresIn)
  const map: Record<string, string> = {}
  data?.forEach(d => { if (d.signedUrl && d.path) map[d.path] = d.signedUrl })
  return map
}

export async function getSignedUrlAlimentador(sb: SupabaseClient, path: string, expiresIn = 3600): Promise<string | null> {
  const { data } = await sb.storage.from(BUCKET_ALIMENTADORES).createSignedUrl(path, expiresIn)
  return data?.signedUrl ?? null
}

export async function getSignedUrlsAlimentador(sb: SupabaseClient, paths: string[], expiresIn = 3600): Promise<Record<string, string>> {
  if (!paths.length) return {}
  const { data } = await sb.storage.from(BUCKET_ALIMENTADORES).createSignedUrls(paths, expiresIn)
  const map: Record<string, string> = {}
  data?.forEach(d => { if (d.signedUrl && d.path) map[d.path] = d.signedUrl })
  return map
}

// Genérica, para previsualizar una firma (CampoFirma) cuyo bucket varía
// según el módulo que la use — RIC, Prevención o Test de Alimentadores.
export async function getSignedUrlDeBucket(sb: SupabaseClient, bucket: string, path: string, expiresIn = 3600): Promise<string | null> {
  const { data } = await sb.storage.from(bucket).createSignedUrl(path, expiresIn)
  return data?.signedUrl ?? null
}
