import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import { ToastProvider } from '@/contexts/ToastContext'

export const metadata: Metadata = {
  title: '2C Electricidad — Inventario',
  description: 'Sistema de gestión de inventario para taller de tableros eléctricos',
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='28' font-size='28'>⚡</text></svg>" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ToastProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            {/* Contenido principal — margen izquierdo = ancho del sidebar en md+ */}
            <main className="flex-1 md:ml-56 min-h-screen flex flex-col">
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  )
}
