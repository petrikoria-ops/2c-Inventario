// Portada compartida por todos los documentos generados (Verificación RIC,
// Prevención de Riesgos, Test de Alimentadores): kicker + logo, regla,
// título/subtítulo/descripción centrados y caja de datos clave — misma
// estructura para los tres, cada uno con sus propios campos. Paleta de
// marca ya usada en el documento RIC (#2E333A / #F0C000), no la del
// documento de referencia.
interface CampoPortada {
  label: string
  value: React.ReactNode
}

interface Props {
  kicker: string
  numero: string
  fecha: string
  titulo: string
  subtitulo: string
  descripcion?: string
  campos: CampoPortada[]
}

export default function PortadaDocumento({ kicker, numero, fecha, titulo, subtitulo, descripcion, campos }: Props) {
  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <p className="text-[11px] uppercase tracking-widest max-w-md" style={{ color: 'var(--n-500)' }}>{kicker}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-2c.png" alt="2C Montajes" style={{ height: 40, width: 'auto', flexShrink: 0 }} />
      </div>

      <div style={{ height: 2, backgroundColor: '#2E333A', marginBottom: 28 }} />

      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold" style={{ color: '#2E333A' }}>{titulo}</h1>
        <p className="text-base mt-1" style={{ color: '#4A5260' }}>{subtitulo}</p>
        <p className="text-xs mt-2 font-semibold" style={{ color: '#F0C000' }}>
          {numero} · {fecha}
        </p>
        {descripcion && (
          <p className="text-xs italic mt-3 max-w-xl mx-auto" style={{ color: 'var(--n-500)' }}>{descripcion}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 rounded-xl text-sm" style={{ background: '#F5F6F7', border: '1px solid #E2E4E7' }}>
        {campos.map((c, i) => (
          <div key={i}>
            <p className="text-[10px] uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--n-500)' }}>{c.label}</p>
            <p className="font-semibold" style={{ color: '#181818' }}>{c.value ?? '—'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
