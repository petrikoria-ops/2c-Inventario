# 2C Electricidad — Inventario (Next.js + Supabase)

Sistema de gestión de inventario para el taller de tableros eléctricos.
Tecnologías: **Next.js 14 · Supabase · Tailwind CSS · TypeScript**

---

## ¿Cómo funciona?

```
Tu navegador → Next.js (Vercel) → Supabase (PostgreSQL en la nube)
                    ↑
              Las alertas de stock se actualizan en tiempo real
              sin recargar la página (Supabase Realtime)
```

---

## Paso a paso: desde cero hasta desplegado

### Paso 1 — Crear proyecto en Supabase (gratis)

1. Ir a **https://supabase.com** → clic en **Start your project**
2. Crear cuenta con GitHub o Google
3. Clic en **New project**
   - Organization: la que aparece por defecto
   - Name: `2c-inventario`
   - Database Password: anota una contraseña (no la necesitarás a menudo)
   - Region: **South America (São Paulo)** — el más cercano a Chile
4. Esperar ~2 minutos mientras se crea el proyecto

### Paso 2 — Crear las tablas (schema)

1. En Supabase, clic en **SQL Editor** (ícono de código en el menú izquierdo)
2. Clic en **New query**
3. Copiar y pegar el contenido de `supabase/schema.sql`
4. Clic en **Run** (botón verde o `Ctrl+Enter`)
5. Deberías ver: `Success. No rows returned`

### Paso 3 — Cargar datos de ejemplo (seed)

1. En **SQL Editor**, clic en **New query** (nueva pestaña)
2. Copiar y pegar el contenido de `supabase/seed.sql`
3. Clic en **Run**
4. Deberías ver: `Success. X rows affected`

### Paso 4 — Copiar las variables de conexión

1. En Supabase, ir a **Settings** (ícono de engranaje) → **API**
2. Copiar:
   - **Project URL** → es tu `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → es tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Paso 5 — Configurar variables locales

1. En la carpeta `2c-inventario-next/`, crear un archivo llamado **`.env.local`**
   (copia `.env.example` y renómbralo)
2. Completar con los valores copiados:

```
NEXT_PUBLIC_SUPABASE_URL=https://XXXXXXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

> ⚠️ **Importante**: `.env.local` está en `.gitignore` — nunca se sube a GitHub.
> Es solo para tu computador local.

### Paso 6 — Instalar y ejecutar localmente

Necesitas tener **Node.js 18+** instalado (https://nodejs.org).

```bash
# Desde la carpeta 2c-inventario-next/
npm install
npm run dev
```

Abrir en el navegador: **http://localhost:3000**

---

## Desplegar en Vercel (gratis)

Vercel es la plataforma oficial de Next.js. Tu app queda accesible desde cualquier
celular o computador con internet.

### Paso 7 — Subir el código a GitHub

1. Crear cuenta en **https://github.com** si no tienes
2. Crear un **New repository** (privado está bien)
3. Seguir las instrucciones de GitHub para subir el código:

```bash
git init
git add .
git commit -m "primer commit - inventario 2C"
git remote add origin https://github.com/TU_USUARIO/2c-inventario.git
git push -u origin main
```

### Paso 8 — Conectar GitHub a Vercel

1. Ir a **https://vercel.com** → crear cuenta (preferiblemente con GitHub)
2. Clic en **Add New → Project**
3. Clic en **Import** junto a tu repositorio `2c-inventario`
4. Vercel detecta automáticamente que es un proyecto Next.js
5. **Antes de hacer Deploy**, expandir **Environment Variables** y agregar:
   - `NEXT_PUBLIC_SUPABASE_URL` = (tu URL de Supabase)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (tu clave anon de Supabase)
6. Clic en **Deploy**

¡Listo! En ~2 minutos tendrás una URL pública tipo:
`https://2c-inventario-xxxx.vercel.app`

### Actualizaciones futuras

Cada vez que hagas `git push` a GitHub, Vercel redesplegará automáticamente.

---

## Variables de entorno

| Variable | Dónde encontrarla | Para qué sirve |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | Conectar con la base de datos |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key | Autenticar las consultas |

El prefijo `NEXT_PUBLIC_` permite que Next.js las use tanto en el servidor como en el
navegador (necesario para el tiempo real).

---

## Módulos

| Ruta | Módulo | Descripción |
|---|---|---|
| `/` | Dashboard | Estadísticas, alertas en tiempo real, últimos movimientos |
| `/materiales` | Materiales | CRUD + movimientos rápidos + historial por ítem |
| `/herramientas` | Herramientas | Estado y control de mantención |
| `/movimientos` | Movimientos | Historial global con filtros |
| `/proyectos` | Proyectos / OT | Costeo de materiales por orden de trabajo |
| `/proveedores` | Proveedores | Datos de contacto y plazos |
| `/recursos` | Recursos | Calculadoras eléctricas + normativa RIC + checklist |

---

## Tiempo real (Supabase Realtime)

El Dashboard escucha automáticamente los cambios en la tabla `materiales`.
Cuando se registra un movimiento que afecta el stock, la tabla de alertas
se actualiza sin necesidad de recargar la página.

Esto ya está configurado en `supabase/schema.sql` con:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE materiales;
```

---

## Estructura del proyecto

```
app/
  page.tsx                  ← Dashboard (Server Component)
  materiales/page.tsx       ← Página de materiales
  api/
    materiales/route.ts     ← GET/POST materiales
    materiales/[id]/route.ts← PUT/DELETE material específico
    movimientos/route.ts    ← GET/POST movimientos
    export/*/route.ts       ← Exportar CSV

components/
  layout/Sidebar.tsx        ← Menú lateral (responsive)
  ui/Modal.tsx              ← Modal reutilizable
  ui/Badge.tsx              ← Badges de estado
  materiales/TablaMateriales.tsx ← Tabla interactiva con CRUD
  dashboard/AlertasStockRealtime.tsx ← Alertas con Realtime

lib/
  supabase/client.ts        ← Cliente para el navegador
  supabase/server.ts        ← Cliente para el servidor
  utils.ts                  ← Formateo de números, fechas, etc.

supabase/
  schema.sql                ← Crear tablas en Supabase
  seed.sql                  ← Datos de ejemplo
```

---

## Preguntas frecuentes

**¿Cómo agregar un nuevo usuario?**
Por ahora el campo "usuario" es texto libre. Para múltiples usuarios con contraseña,
Supabase tiene un sistema de Auth integrado (futuro paso).

**¿Cómo cambiar el puerto local?**
```bash
npm run dev -- -p 3001
```

**¿Puedo usar desde el celular del taller?**
Sí. Si estás en la misma red WiFi, accede con la IP del PC:
`http://192.168.X.X:3000`. O despliega en Vercel para acceso desde cualquier lugar.

**¿Los datos están seguros en Supabase?**
Para uso interno (sin login), la configuración actual desactiva RLS.
Para un uso más seguro, habilita Row Level Security en Supabase y
crea políticas de acceso.
