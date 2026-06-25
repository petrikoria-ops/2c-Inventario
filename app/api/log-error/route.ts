import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/errors/logError'

export const dynamic = 'force-dynamic'

// Pensado para reportes desde el cliente (ej. un error boundary de React)
// además de las llamadas directas a logError() desde el servidor.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { mensaje, stack, archivo, departamento } = body

  if (!mensaje || typeof mensaje !== 'string') {
    return NextResponse.json({ error: 'Falta "mensaje".' }, { status: 400 })
  }

  await logError({ mensaje, stack, archivo, departamento })
  return NextResponse.json({ ok: true })
}
