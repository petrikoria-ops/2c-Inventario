/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Client Router Cache: cuánto tiempo el navegador puede reutilizar el RSC
    // payload de una ruta ya visitada al volver a ella con <Link>.
    //
    // Estaba en `dynamic: 0`, que lo desactivaba por completo: TODA navegación
    // entre pestañas —incluso volver a una que se acababa de ver— disparaba un
    // request nuevo al servidor (Chile → función en us-east-1 → Supabase →
    // vuelta), con sus ~250ms de red antes de siquiera empezar a consultar.
    // Peor todavía: con staleTime 0 el prefetch de <Link> queda inservible
    // (lo que se precarga se descarta al instante), así que el menú lateral
    // estaba precargando rutas para nada.
    //
    // El motivo original de ponerlo en 0 era que /materiales mostraba datos
    // viejos al volver desde otra pestaña. Eso ahora se resuelve donde
    // corresponde: cada flujo que muta datos llama a router.refresh(), que
    // invalida esta caché entera al instante. Así se tiene lo mejor de los
    // dos lados — navegación instantánea entre pestañas, y dato fresco apenas
    // alguien crea/edita/elimina algo.
    staleTimes: {
      dynamic: 30,  // rutas dinámicas (todas las de la app)
      static: 180,  // rutas estáticas / prefetch completo
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // Herramientas de terreno (public/terreno/*.html): sacan fotos con la
        // cámara del teléfono, así que aquí se permite la cámara (va después
        // de la regla general para sobrescribir su Permissions-Policy).
        source: '/terreno/:path*',
        headers: [
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}
export default nextConfig
