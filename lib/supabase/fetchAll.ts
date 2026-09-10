import type { SupabaseClient } from '@supabase/supabase-js'

// Columnas que necesitan, entre las tres, HomePage (app/page.tsx), el
// Resumen ejecutivo del día y el Widget de Bodega para calcular alertas de
// stock — se pide una sola vez en HomePage y se pasa como prop a los otros
// dos en vez de que cada uno vuelva a traer toda la tabla.
export interface MaterialAlerta {
  id: number
  codigo: string
  descripcion: string
  stock_actual: number
  stock_minimo: number
  ubicacion: string | null
}

const PAGE_SIZE = 1000

// PostgREST devuelve como máximo db-max-rows filas por consulta (1000 en
// Supabase) aunque se pida más con .limit(). Para cálculos que necesitan
// TODAS las filas (conteos, sumas), hay que paginar con .range() hasta
// agotar la tabla.
//
// PERFORMANCE: antes esto era un `while` que pedía las páginas de a una,
// esperando cada una para recién disparar la siguiente. Con el catálogo
// actual (2.300+ materiales) eran 3 viajes a Supabase encadenados, y esto
// corre en el render del Inicio y de Métricas — o sea, en el camino crítico
// de las dos pestañas más visitadas.
//
// Ahora son 2 pasos:
//   1. La primera página pedida con `count: 'exact'` — un solo viaje que
//      trae las primeras 1000 filas Y de paso cuántas hay en total, así no
//      hace falta una consulta de conteo aparte.
//   2. Si falta más, TODAS las páginas restantes salen juntas con
//      Promise.all, así que tardan lo que la más lenta, no la suma.
//
// Se ordena por `id`: sin ORDER BY, Postgres no garantiza que el corte de
// cada .range() sea estable, y las páginas podían solaparse o saltarse
// filas — un riesgo real que ya existía en la versión secuencial y que al
// pedir las páginas en paralelo conviene cerrar de una vez.
export async function fetchAllMateriales<T>(sb: SupabaseClient, columns: string): Promise<T[]> {
  const pagina = (desde: number, conConteo = false) =>
    sb.from('materiales')
      .select(columns, conConteo ? { count: 'exact' } : undefined)
      .eq('activo', true)
      .order('id')
      .range(desde, desde + PAGE_SIZE - 1)

  const primera = await pagina(0, true)
  if (primera.error || !primera.data) return []

  const filas = primera.data as unknown as T[]
  const total = primera.count ?? filas.length
  if (total <= PAGE_SIZE) return filas

  const paginasRestantes = Math.ceil(total / PAGE_SIZE) - 1
  const resto = await Promise.all(
    Array.from({ length: paginasRestantes }, (_, i) => pagina((i + 1) * PAGE_SIZE)),
  )

  return filas.concat(...resto.map(r => (r.data ?? []) as unknown as T[]))
}
