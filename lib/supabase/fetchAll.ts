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

// PostgREST devuelve como máximo db-max-rows filas por defecto (1000 en
// Supabase) aunque se pida más con .limit(). Para cálculos que necesitan
// TODAS las filas (conteos, sumas), hay que paginar con .range() hasta
// agotar la tabla — el mismo patrón que ya usa /api/materiales para el
// filtro bajo_minimo.
export async function fetchAllMateriales<T>(sb: SupabaseClient, columns: string): Promise<T[]> {
  const all: T[] = []
  let from = 0
  while (true) {
    const { data, error } = await sb
      .from('materiales')
      .select(columns)
      .eq('activo', true)
      .range(from, from + PAGE_SIZE - 1)
    if (error || !data) break
    all.push(...(data as T[]))
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return all
}
