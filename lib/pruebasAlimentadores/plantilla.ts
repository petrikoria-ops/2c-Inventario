// Test de Alimentadores — un informe (pruebas_alimentadores) puede tener
// varios alimentadores (pruebas_alimentadores_alimentadores); cada uno
// arrastra las mismas 10 mediciones fijas entre fases, neutro y tierra.
// Al crear un alimentador se copia el `texto` de cada ítem a una fila
// nueva en pruebas_alimentadores_items — un alimentador ya creado no
// cambia si esta plantilla se edita después (mismo criterio que
// lib/verificacionRic/plantilla.ts).

export interface ItemPlantillaAlimentadores {
  texto: string
  orden: number
}

export const ITEMS_PLANTILLA_ALIMENTADORES: ItemPlantillaAlimentadores[] = [
  { texto: 'Medición Neutro – Fase R', orden: 0 },
  { texto: 'Medición Neutro – Fase S', orden: 1 },
  { texto: 'Medición Neutro – Fase T', orden: 2 },
  { texto: 'Medición Fase R – Fase S', orden: 3 },
  { texto: 'Medición Fase R – Fase T', orden: 4 },
  { texto: 'Medición Fase S – Fase T', orden: 5 },
  { texto: 'Medición Fase R – Tierra', orden: 6 },
  { texto: 'Medición Fase S – Tierra', orden: 7 },
  { texto: 'Medición Fase T – Tierra', orden: 8 },
  { texto: 'Medición Neutro – Tierra', orden: 9 },
]

// Filas listas para insertar en pruebas_alimentadores_items al crear un
// alimentador nuevo (en la creación del informe o agregado después).
export function filasItemsAlimentador(pruebaId: number, alimentadorId: number) {
  return ITEMS_PLANTILLA_ALIMENTADORES.map(it => ({
    prueba_id: pruebaId,
    alimentador_id: alimentadorId,
    orden: it.orden,
    texto: it.texto,
  }))
}
