// Checklist "Verificación de Instalaciones de Faena" (base DS 594), portado
// 1:1 desde referencia/checklist-faena.json de la skill kit-prevencionista-riesgos.
// Solo "No Cumple" genera un hallazgo. nivel_default/norma/mp son sugerencias
// iniciales — se guardan editables en cada inspección (ver
// app/api/prevencion-riesgos/route.ts), esta plantilla no se referencia en
// vivo: una inspección ya creada no cambia si se edita este archivo después.

import type { NivelRiesgo } from './clasificacionRiesgo'

export type ResultadoChecklist = 'cumple' | 'no_cumple' | 'na'

export interface ItemChecklistFaena {
  n: number
  item: string
  categoria: string
  norma: string[]
  nivel_default: NivelRiesgo
  mp: string[]
  hallazgo: string
}

// Orden de categorías según primera aparición en el checklist — para
// agrupar el formulario sin depender del orden alfabético.
export const CATEGORIAS_CHECKLIST_FAENA = [
  'Riesgo eléctrico', 'Infraestructura', 'Orden y aseo', 'Trabajo en altura',
  'Agua y saneamiento', 'Bienestar', 'Higiene', 'Gas / seguridad',
  'Señalética', 'Comedor', 'Emergencia',
] as const

export const CHECKLIST_FAENA_DS594: ItemChecklistFaena[] = [
  { n: 1, item: 'Tomas de corriente en buen estado', categoria: 'Riesgo eléctrico', norma: ['sec-ric', 'ds-594'], nivel_default: 'ALTO', mp: ['MP-15', 'MP-13'], hallazgo: 'Tomas de corriente en mal estado / deterioradas.' },
  { n: 2, item: 'Enchufes y cableado de equipos en buen estado', categoria: 'Riesgo eléctrico', norma: ['sec-ric', 'ds-594'], nivel_default: 'ALTO', mp: ['MP-15', 'MP-12'], hallazgo: 'Enchufes o cableado de equipos deteriorados.' },
  { n: 3, item: 'Sin cables a la vista que generen riesgo', categoria: 'Riesgo eléctrico', norma: ['sec-ric', 'ds-594'], nivel_default: 'ALTO', mp: ['MP-12', 'MP-13'], hallazgo: 'Se observan cables a la vista que generan riesgo de contacto eléctrico / tropiezo.' },
  { n: 4, item: 'Techo sin filtraciones', categoria: 'Infraestructura', norma: ['ds-594'], nivel_default: 'MEDIO', mp: ['MP-12'], hallazgo: 'Techo con filtraciones.' },
  { n: 5, item: 'Piso parejo, sin elementos que sobresalgan', categoria: 'Orden y aseo', norma: ['ds-594'], nivel_default: 'MEDIO', mp: ['MP-12', 'MP-16'], hallazgo: 'Piso irregular o con elementos que sobresalen (riesgo de caída a nivel).' },
  { n: 6, item: 'Interior limpio y ordenado, sin obstáculos al tránsito', categoria: 'Orden y aseo', norma: ['ds-594'], nivel_default: 'MEDIO', mp: ['MP-16', 'MP-13'], hallazgo: 'Interior con desorden u obstáculos que impiden el tránsito.' },
  { n: 7, item: 'Exterior limpio y despejado, sin acumulación de basura', categoria: 'Orden y aseo', norma: ['ds-594'], nivel_default: 'BAJO', mp: ['MP-16'], hallazgo: 'Exterior con acumulación de basura / desorden.' },
  { n: 8, item: 'Iluminación interior adecuada para el normal funcionamiento', categoria: 'Infraestructura', norma: ['ds-594'], nivel_default: 'MEDIO', mp: ['MP-12'], hallazgo: 'Iluminación interior deficiente.' },
  { n: 9, item: 'Contenedor en 2º piso con escalera y baranda de acceso', categoria: 'Trabajo en altura', norma: ['ds-594'], nivel_default: 'ALTO', mp: ['MP-12', 'MP-13'], hallazgo: 'Acceso a contenedor en altura sin escalera y/o baranda (riesgo de caída de altura).' },
  { n: 10, item: 'Suministro de agua potable en la faena', categoria: 'Agua y saneamiento', norma: ['ds-594'], nivel_default: 'ALTO', mp: ['MP-12', 'MP-08'], hallazgo: 'Sin suministro de agua potable en la faena.' },
  { n: 11, item: 'Duchas separadas por sexo, con agua fría y caliente', categoria: 'Bienestar', norma: ['ds-594'], nivel_default: 'MEDIO', mp: ['MP-12'], hallazgo: 'Duchas insuficientes / sin separación por sexo / sin agua caliente.' },
  { n: 12, item: 'Artefactos de duchas operativos (ducha, llave, cortina)', categoria: 'Bienestar', norma: ['ds-594'], nivel_default: 'BAJO', mp: ['MP-12'], hallazgo: 'Artefactos de ducha en mal estado.' },
  { n: 13, item: 'Duchas limpias', categoria: 'Higiene', norma: ['ds-594'], nivel_default: 'BAJO', mp: ['MP-16'], hallazgo: 'Duchas en condiciones deficientes de aseo.' },
  { n: 14, item: 'Calentadores de agua a gas instalados fuera del recinto y ventilados', categoria: 'Gas / seguridad', norma: ['ds-594', 'sec-ric'], nivel_default: 'ALTO', mp: ['MP-12', 'MP-13'], hallazgo: 'Calentador a gas dentro de recinto / sin ventilación (riesgo de intoxicación por CO o explosión).' },
  { n: 15, item: 'Baños separados por sexo y protegidos del ingreso de vectores', categoria: 'Agua y saneamiento', norma: ['ds-594'], nivel_default: 'MEDIO', mp: ['MP-12'], hallazgo: 'Baños sin separación por sexo o expuestos a vectores.' },
  { n: 16, item: 'Baños con agua fría/caliente, dispensador de jabón y papel', categoria: 'Higiene', norma: ['ds-594'], nivel_default: 'BAJO', mp: ['MP-12'], hallazgo: 'Baños sin agua, jabón o papel.' },
  { n: 17, item: 'Artefactos de baño operativos (WC, cadena, llave, lavamanos)', categoria: 'Higiene', norma: ['ds-594'], nivel_default: 'BAJO', mp: ['MP-12'], hallazgo: 'Artefactos de baño en mal estado.' },
  { n: 18, item: 'Baños limpios', categoria: 'Higiene', norma: ['ds-594'], nivel_default: 'BAJO', mp: ['MP-16'], hallazgo: 'Baños en condiciones deficientes de aseo.' },
  { n: 19, item: 'Señalética sobre correcto lavado de manos', categoria: 'Señalética', norma: ['ds-594'], nivel_default: 'BAJO', mp: ['MP-13'], hallazgo: 'Sin señalética de lavado de manos.' },
  { n: 20, item: 'Baños químicos con frecuencia de descarga/vaciado definida', categoria: 'Agua y saneamiento', norma: ['ds-594'], nivel_default: 'BAJO', mp: ['MP-19'], hallazgo: 'Baños químicos sin programa de descarga/vaciado.' },
  { n: 21, item: 'Vestidores por sexo, limpios y protegidos del clima', categoria: 'Bienestar', norma: ['ds-594'], nivel_default: 'BAJO', mp: ['MP-12'], hallazgo: 'Vestidores insuficientes o desprotegidos.' },
  { n: 22, item: 'Casilleros ventilados y en número igual al total de trabajadores', categoria: 'Bienestar', norma: ['ds-594'], nivel_default: 'BAJO', mp: ['MP-12'], hallazgo: 'Casilleros insuficientes o en mal estado.' },
  { n: 23, item: 'Comedor aislado de áreas de trabajo y protegido de vectores', categoria: 'Comedor', norma: ['ds-594'], nivel_default: 'MEDIO', mp: ['MP-12'], hallazgo: 'Comedor no aislado o expuesto a contaminación/vectores.' },
  { n: 24, item: 'Comedor limpio', categoria: 'Higiene', norma: ['ds-594'], nivel_default: 'BAJO', mp: ['MP-16'], hallazgo: 'Comedor en condiciones deficientes de aseo.' },
  { n: 25, item: 'Comedor con mesas y sillas lavables y piso sólido de fácil limpieza', categoria: 'Comedor', norma: ['ds-594'], nivel_default: 'BAJO', mp: ['MP-12'], hallazgo: 'Mobiliario o piso del comedor inadecuado.' },
  { n: 26, item: 'Comedor con refrigerador y lavaplatos', categoria: 'Comedor', norma: ['ds-594'], nivel_default: 'BAJO', mp: ['MP-12'], hallazgo: 'Comedor sin refrigerador y/o lavaplatos.' },
  { n: 27, item: 'Señalética de vías de evacuación en la faena', categoria: 'Emergencia', norma: ['ds-594', 'nch-2189'], nivel_default: 'ALTO', mp: ['MP-13'], hallazgo: 'Sin señalética de vías de evacuación.' },
  { n: 28, item: 'Señalética de uso de EPP en la faena', categoria: 'Señalética', norma: ['ds-594'], nivel_default: 'MEDIO', mp: ['MP-13'], hallazgo: 'Sin señalética de uso obligatorio de EPP.' },
  { n: 29, item: 'Extintores operativos, limpios, despejados y de fácil acceso', categoria: 'Emergencia', norma: ['nch-1433', 'ds-594'], nivel_default: 'ALTO', mp: ['MP-12', 'MP-13'], hallazgo: 'Extintores obstruidos, en mal estado o de difícil acceso.' },
  { n: 30, item: 'Extintores en cantidad suficiente', categoria: 'Emergencia', norma: ['nch-1433', 'ds-594'], nivel_default: 'ALTO', mp: ['MP-12'], hallazgo: 'Cantidad de extintores insuficiente para la faena.' },
  { n: 31, item: 'Extintores con mantenimiento al día', categoria: 'Emergencia', norma: ['nch-1433', 'ds-594'], nivel_default: 'MEDIO', mp: ['MP-15'], hallazgo: 'Extintores con mantención/certificación vencida.' },
  { n: 32, item: 'Extintores con señalética', categoria: 'Emergencia', norma: ['nch-1433'], nivel_default: 'MEDIO', mp: ['MP-13'], hallazgo: 'Extintores sin señalética de ubicación.' },
  { n: 33, item: 'Zona de fumadores señalizada, con depósito de colillas y alejada del comedor', categoria: 'Orden y aseo', norma: ['ds-594'], nivel_default: 'BAJO', mp: ['MP-13'], hallazgo: 'Zona de fumadores sin señalizar / sin depósito / cercana al comedor.' },
]
