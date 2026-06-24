/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // El Client Router Cache reutiliza el RSC payload de rutas visitadas en
    // navegación soft (<Link>) sin volver a pedirlo al servidor durante su
    // staleTime (default ~30s). Por eso /materiales mostraba una versión vieja
    // al volver desde otra pestaña aunque el servidor siempre tuviera el dato
    // fresco. dynamic:0 fuerza a que toda ruta dinámica se revalide siempre.
    staleTimes: { dynamic: 0 },
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
    ]
  },
}
export default nextConfig
