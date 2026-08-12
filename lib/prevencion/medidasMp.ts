// Catálogo de medidas correctivas estandarizadas (MP-XX), portado 1:1 desde
// referencia/medidas-mp.json de la skill kit-prevencionista-riesgos.
// Un hallazgo puede combinar varios códigos (ej. MP-20 + MP-01 + MP-07).

export interface MedidaMp {
  codigo: string
  texto: string
}

export interface GrupoMedidasMp {
  grupo: string
  medidas: MedidaMp[]
}

export const GRUPOS_MEDIDAS_MP: GrupoMedidasMp[] = [
  {
    grupo: 'Capacitación / Conductual',
    medidas: [
      { codigo: 'MP-01', texto: 'Reinducción de procedimiento de trabajo' },
      { codigo: 'MP-02', texto: 'Charla de seguridad específica (5 min)' },
      { codigo: 'MP-03', texto: 'Capacitación formal en la materia' },
      { codigo: 'MP-04', texto: 'Difusión de procedimiento / instructivo' },
      { codigo: 'MP-05', texto: 'Observación de conducta / refuerzo positivo' },
    ],
  },
  {
    grupo: 'Disciplinarias',
    medidas: [
      { codigo: 'MP-06', texto: 'Amonestación verbal' },
      { codigo: 'MP-07', texto: 'Carta de amonestación escrita' },
      { codigo: 'MP-08', texto: 'Notificación a jefatura directa' },
    ],
  },
  {
    grupo: 'Elementos de Protección Personal (EPP)',
    medidas: [
      { codigo: 'MP-09', texto: 'Entrega de elemento de protección personal' },
      { codigo: 'MP-10', texto: 'Reposición de EPP deteriorado' },
      { codigo: 'MP-11', texto: 'Verificación de uso correcto de EPP' },
    ],
  },
  {
    grupo: 'Condiciones / Ingeniería',
    medidas: [
      { codigo: 'MP-12', texto: 'Corrección de condición subestándar' },
      { codigo: 'MP-13', texto: 'Señalización / demarcación de área' },
      { codigo: 'MP-14', texto: 'Bloqueo / restricción de acceso (LOTO)' },
      { codigo: 'MP-15', texto: 'Reparación o retiro de equipo / herramienta defectuosa' },
      { codigo: 'MP-16', texto: 'Orden y limpieza del área' },
    ],
  },
  {
    grupo: 'Documental / Administrativo',
    medidas: [
      { codigo: 'MP-17', texto: 'Actualización de IPER / MIPER' },
      { codigo: 'MP-18', texto: 'Permiso de trabajo / ART antes de iniciar' },
      { codigo: 'MP-19', texto: 'Registro en libro de obra / SSO' },
      { codigo: 'MP-20', texto: 'Detención inmediata de la tarea' },
    ],
  },
]

export const MEDIDAS_MP: MedidaMp[] = GRUPOS_MEDIDAS_MP.flatMap(g => g.medidas)

export function getMedidaMp(codigo: string): MedidaMp | undefined {
  return MEDIDAS_MP.find(m => m.codigo === codigo)
}
