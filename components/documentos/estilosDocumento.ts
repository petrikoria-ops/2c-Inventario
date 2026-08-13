// CSS de impresión compartido por las páginas [id]/imprimir de Verificación
// RIC, Prevención de Riesgos y Test de Alimentadores. Antes vivía duplicado
// (con prefijo `ric-*`) dentro del imprimir de RIC — se generaliza a `doc-*`
// para que lo use cualquier documento sin volver a copiar el bloque.
export const ESTILOS_IMPRESION_DOCUMENTO = `
  @media print {
    aside, .no-print { display: none !important; }
    main { margin: 0 !important; padding: 0 !important; background: white !important; }
    .print-doc { box-shadow: none !important; margin: 0 !important; border: none !important; }
    @page { margin: 1.6cm; size: A4; }

    .doc-portada { break-after: page; page-break-after: always; }
    .doc-cierre  { break-before: page; page-break-before: always; }
    .doc-bloque  { break-inside: avoid; page-break-inside: avoid; }
    .doc-bloque-titulo { break-after: avoid; page-break-after: avoid; }
    table { break-inside: auto; }
    tr    { break-inside: avoid; page-break-inside: avoid; }
    thead { display: table-header-group; }
  }
  .doc-th   { background-color: #2E333A; color: #9AA3AE; padding: 6px 10px; text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .doc-th-r { text-align: right; }
  .doc-td   { padding: 6px 10px; font-size: 12px; border-bottom: 1px solid #ECEEF1; }
  .doc-td-r { padding: 6px 10px; font-size: 12px; border-bottom: 1px solid #ECEEF1; text-align: right; }
`
