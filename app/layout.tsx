import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import { ToastProvider } from '@/contexts/ToastContext'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '2C Montajes · Inventario',
  description: 'Sistema de gestión de inventario — 2C Montajes y Proyectos Eléctricos',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='5' fill='%232E333A'/><text y='23' x='3' font-size='17' font-weight='700' font-family='Inter,system-ui' fill='%23F0C000'>2C</text></svg>",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body>
        <ToastProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 md:ml-56 min-h-screen flex flex-col">
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  )
}
