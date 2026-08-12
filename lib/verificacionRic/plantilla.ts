// Plantilla estática de la Sección A — Verificación Inicial y Puesta en
// Marcha, RIC N°18/19 (transcrita de Checklist_Terreno_SAT_PuestaEnMarcha.docx).
// v1 = solo Sección A (A.0–A.11 + cierre). El Anexo SAT por tablero, la
// librería de tipos de tablero y las 5 tablas de medición detalladas
// quedan fuera de esta entrega.
//
// POST /api/verificacion-ric copia el `texto` de cada ítem a una fila
// nueva en verificaciones_ric_items — una verificación ya creada no
// cambia si esta plantilla se edita después.

export interface BloquePlantilla {
  id: string
  titulo: string
  refNormativa?: string
}

export interface ItemPlantilla {
  bloque: string
  tipo: 'verificacion' | 'foto' | 'nota'
  texto: string
  orden: number
}

export const BLOQUES_RIC: BloquePlantilla[] = [
  { id: 'A.0',  titulo: 'Documentación del proyecto, coordinación con Oficina Técnica e informes que se generan con este checklist', refNormativa: 'RIC N°18' },
  { id: 'A.1',  titulo: 'Continuidad de conductores de protección, uniones equipotenciales y puesta a tierra', refNormativa: '7.1.3.1' },
  { id: 'A.2',  titulo: 'Resistencia de aislamiento de la instalación eléctrica', refNormativa: '7.1.3.2' },
  { id: 'A.3',  titulo: 'Protección por separación de circuitos (MBTS/MBTP) o protección por separación eléctrica', refNormativa: '7.1.3.3' },
  { id: 'A.4',  titulo: 'Resistencia/impedancia de suelos y paredes', refNormativa: '7.1.3.4' },
  { id: 'A.5',  titulo: 'Protección o desconexión automática de la alimentación', refNormativa: '7.1.3.5' },
  { id: 'A.6',  titulo: 'Protección complementaria', refNormativa: '7.1.3.6' },
  { id: 'A.7',  titulo: 'Ensayo de polaridad', refNormativa: '7.1.3.7' },
  { id: 'A.8',  titulo: 'Ensayo del orden de las fases', refNormativa: '7.1.3.8' },
  { id: 'A.9',  titulo: 'Caída de tensión', refNormativa: '7.1.3.9' },
  { id: 'A.10', titulo: 'Pruebas de funcionalidad', refNormativa: '7.1.3.10' },
  { id: 'A.11', titulo: 'Niveles de iluminación e iluminación de emergencia / señalética de evacuación', refNormativa: '7.1.3.11' },
  { id: 'CIERRE', titulo: 'Registro fotográfico general de la visita' },
]

function bloque(id: string, verificacion: string[], foto: string[] = []): ItemPlantilla[] {
  return [
    ...verificacion.map((texto, i): ItemPlantilla => ({ bloque: id, tipo: 'verificacion', texto, orden: i })),
    ...foto.map((texto, i): ItemPlantilla => ({ bloque: id, tipo: 'foto', texto, orden: verificacion.length + i })),
    { bloque: id, tipo: 'nota', texto: 'Notas / Observaciones', orden: verificacion.length + foto.length },
  ]
}

export const ITEMS_PLANTILLA_RIC: ItemPlantilla[] = [
  ...bloque('A.0',
    [
      'Proyecto eléctrico aprobado disponible en terreno (planos, memoria explicativa y especificaciones técnicas)',
      'Cuadro de cargas final coincide con lo efectivamente instalado, o los cambios están identificados para el as-built',
      'Certificados / sellos SEC de materiales y equipos instalados, visibles o disponibles en terreno',
      'Instalador eléctrico autorizado responsable identificado (clase correspondiente), presente o disponible',
      'Formulario TE1/TE2 disponible o en trámite, según corresponda',
      'Hubo adicionales o cambios respecto al proyecto aprobado durante esta visita (marcar N/A si no hubo)',
      'Cada adicional/cambio fue registrado en el Anexo 6, con ubicación y motivo',
      'Fotos de cada adicional/cambio tomadas',
    ],
    [
      'Enviado a Oficina Técnica',
      'Fotos de procesos de instalación y pruebas',
      'Datos de As Built de obra (planos marcados con lo realmente ejecutado)',
      'Anexo 6 — Registro de Adicionales/Cambios en Obra, completo',
      'OT (orden de trabajo) entregada / actualizada',
      'Este checklist de terreno completo, con todos sus Informes de Medición',
    ],
  ),
  ...bloque('A.1',
    [
      'Continuidad de conductores de protección medida en todos los alimentadores/sub-alimentadores declarados',
      'Continuidad de las uniones equipotenciales principales medida',
      'Continuidad de las uniones equipotenciales suplementarias medida, si aplica',
      'Resistencia de puesta a tierra del sistema medida',
      'Resistencia de malla/electrodo medida específicamente (no solo el valor genérico del sistema)',
      'Informe de Medición N°1 (alimentadores) completado, sin filas pendientes',
      'Informe de Medición N°4 (puesta a tierra) completado, sin filas pendientes',
    ],
    [
      'Foto del punto de medición identificado (rotulado visible)',
      'Foto del instrumento con la lectura de continuidad',
      'Medición con pinza de tierra',
      'Electrodo/malla de puesta a tierra, si es accesible',
    ],
  ),
  ...bloque('A.2',
    [
      'Resistencia de aislamiento medida en todos los alimentadores/sub-alimentadores declarados',
      'Valores medidos dentro de lo exigido (referencia habitual ≥ 500 kΩ — confirmar exigencia del proyecto)',
      'Export o certificado del instrumento respalda estas mediciones',
      'Informe de Medición N°1 (alimentadores — compartido con 7.1.3.1) completado',
    ],
    ['Foto del instrumento con la lectura de aislamiento'],
  ),
  ...bloque('A.3', [
    'Este proyecto tiene circuitos MBTS, MBTP o protección por separación eléctrica (marcar N/A si no aplica)',
    'Aislamiento entre el circuito MBTS/MBTP y el resto de la instalación verificado',
    'Partes activas del circuito MBTS no conectadas a tierra, si corresponde a un sistema no puesto a tierra',
    'Informe de Medición N°5 (otras verificaciones) completado, si aplica',
  ]),
  ...bloque('A.4', [
    'Este proyecto exige medición de resistencia/impedancia de suelos y paredes (marcar N/A si no aplica)',
    'Medición realizada en los puntos representativos exigidos',
    'Valor dentro de lo exigido por proyecto/norma',
    'Informe de Medición N°5 (otras verificaciones) completado, si aplica',
  ]),
  ...bloque('A.5',
    [
      'Impedancia de bucle de falla (Zs) medida por circuito relevante',
      'Protecciones diferenciales probadas (botón de test) en todos los circuitos que corresponda',
      'Tiempo de disparo diferencial registrado, cuando el instrumento lo mide',
      'Informe de Medición N°2 (bucle y diferencial) completado, sin filas pendientes',
    ],
    ['Instrumento con lectura de bucle y/o disparo diferencial'],
  ),
  ...bloque('A.6', [
    'Protección complementaria por diferencial de alta sensibilidad (≤ 30 mA) verificada donde corresponda (tomas de uso general, exteriores, baños, etc.)',
    'Registrada en el Informe de Medición N°2 (Bucle y Diferencial), junto con el resto de las pruebas de diferenciales',
  ]),
  ...bloque('A.7', [
    'Polaridad fase-neutro-tierra verificada en puntos representativos de la instalación',
    'Informe de Medición N°5 (otras verificaciones) completado',
  ]),
  ...bloque('A.8',
    ['Secuencia/rotación de fases verificada en el origen de la instalación y en tableros con alimentación trifásica'],
    ['Instrumento con lectura de secuencia de fases'],
  ),
  ...bloque('A.9',
    [
      'Tensión de fase y de línea medida en el origen de la instalación y dentro de rango',
      'Caída de tensión medida en el o los circuitos más desfavorables (mayor longitud/carga)',
      'Valores dentro del máximo admisible según proyecto/norma',
      'Informe de Medición N°5 (otras verificaciones) completado',
    ],
    ['Instrumento con lectura de tensión'],
  ),
  ...bloque('A.10', [
    'Inspección visual general (tableros, canalizaciones, rotulado, IP, accesos)',
    'Instalación ejecutada conforme a lo declarado en proyecto aprobado / planos',
    'Prueba funcional general (encendido y operación de circuitos)',
  ]),
  ...bloque('A.11',
    [
      'Medición de lux realizada por sala o recinto exigido por el proyecto',
      'Valores medidos dentro de lo exigido (norma o proyecto)',
      'Ensayo del sistema de iluminación de emergencia (encendido ante corte de suministro), si aplica',
      'Ensayo de señalética de evacuación iluminada, si aplica',
      'Informe de Medición N°3 (lux) completado, sin filas pendientes',
    ],
    [
      'Luxómetro con lectura por recinto relevante',
      'Iluminación de emergencia encendida durante el ensayo, si aplica',
    ],
  ),
  // Cierre: solo el registro fotográfico general — la declaración de
  // conformidad y la firma viven como campos propios de la cabecera
  // (verificaciones_ric.declaracion_conformidad/firma_*), no como ítems.
  {
    bloque: 'CIERRE', tipo: 'foto', orden: 0,
    texto: 'Foto de la puesta a tierra general (electrodo/malla, si es accesible)',
  },
  {
    bloque: 'CIERRE', tipo: 'foto', orden: 1,
    texto: 'Foto de tablero(s) ya energizado(s) / instalación en operación, si se energiza en la misma visita',
  },
  {
    bloque: 'CIERRE', tipo: 'foto', orden: 2,
    texto: 'Foto del entorno/fachada o vista general de la instalación',
  },
]

// Contenido informativo estático de A.0 — quién prepara qué. NO se
// persiste en base de datos, se muestra como referencia fija encima de
// las tablas reales de A.0 en el formulario.
export const A0_COORDINACION: { oficinaTecnica: string; terreno: string }[] = [
  {
    oficinaTecnica: 'Memoria Explicativa (EETT, cálculos lumínicos, caídas de tensión, lux, listado de materiales itemizado, SPT si es instalación nueva, selectividad y coordinación)',
    terreno: 'Mediciones y datos técnicos de este checklist (Informes de Medición N°1 a N°5) y cálculos ejecutados en obra, si los hay',
  },
  {
    oficinaTecnica: 'Informe Fotográfico final',
    terreno: 'Fotos de procesos de instalación y pruebas (registro fotográfico de este checklist)',
  },
  {
    oficinaTecnica: 'As Built y OT definitivos',
    terreno: 'Planos marcados con lo realmente ejecutado, OT actualizada, y el Anexo 6 — Registro de Adicionales/Cambios en Obra (ubicación y motivo de cada uno)',
  },
  {
    oficinaTecnica: 'Informe de Verificación Inicial (IVI)',
    terreno: 'Este checklist completo, con todos sus Informes de Medición',
  },
]

export const A0_INFORMES_PROPIOS_TERRENO =
  'Terreno genera dos informes propios, usando las mediciones y fotos de este mismo checklist: ' +
  'Informe SAT por tablero (solo si aplicó el Anexo opcional SAT) e Informe de Puesta en Marcha / ' +
  'Verificación RIC N°19. Para generarlos: este checklist marcado + export del instrumento + fotos. ' +
  'Oficina Técnica no escribe estos dos informes — son responsabilidad de terreno, aunque Oficina ' +
  'Técnica reciba las mismas mediciones para preparar el Informe de Verificación Inicial (IVI).'
