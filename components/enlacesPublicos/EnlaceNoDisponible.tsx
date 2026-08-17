import { Ban, Clock } from 'lucide-react'

export default function EnlaceNoDisponible({ motivo }: { motivo: 'revocado' | 'vencido' }) {
  const Icono = motivo === 'revocado' ? Ban : Clock
  const titulo = motivo === 'revocado' ? 'Este enlace fue desactivado' : 'Este enlace venció'
  const texto = motivo === 'revocado'
    ? 'Quien te lo compartió lo desactivó. Pídele que genere uno nuevo.'
    : 'Ya pasó la fecha de vencimiento de este enlace. Pídele a quien te lo compartió que genere uno nuevo.'

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F5F6F7' }}>
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm text-center">
        <Icono size={40} className="mx-auto mb-3" style={{ color: '#94A0AF' }} />
        <h1 className="text-lg font-bold mb-2" style={{ color: '#2E333A' }}>{titulo}</h1>
        <p className="text-sm text-brand-n500">{texto}</p>
      </div>
    </main>
  )
}
