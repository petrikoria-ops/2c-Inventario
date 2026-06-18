# 2C Inventario — App Android

## Qué es esto

`2C-Inventario-debug.apk` es un wrapper nativo Android (Capacitor 8) de
`https://2c-inventario.vercel.app`. La app abre el sitio real dentro de una
WebView nativa con ícono, splash screen y colores de marca propios — el
contenido y los datos son exactamente los de la web (Supabase en tiempo real
incluido).

## Instalar en un celular

1. Pasa `2C-Inventario-debug.apk` al teléfono (WhatsApp, USB, Drive, etc.)
2. Ábrelo desde el explorador de archivos del teléfono.
3. Android pedirá permitir "instalar apps de origen desconocido" la primera
   vez — acepta solo para este archivo.
4. Necesita internet (WiFi o datos) para cargar la app, igual que en el navegador.

Es una build **debug**, firmada con una clave de prueba automática — sirve para
instalar y probar, pero no para publicar en Play Store.

## Qué se hizo (capa nativa)

| Elemento | Detalle |
|---|---|
| Ícono y splash | Generados desde la identidad de marca (`#2E333A` carbón / `#F0C000` dorado) |
| Status bar / tema | Colores de marca aplicados vía `colors.xml` nativo |
| Permisos | Solo `INTERNET` (no se detectó cámara, geolocalización, login real ni notificaciones en el código) |
| Conexión | `server.url` apunta a `https://2c-inventario.vercel.app` — cualquier cambio que subas a ese sitio se refleja en la app sin recompilar |

No se modificó el código fuente de la web (Next.js/Supabase) — la app es 100%
un wrapper. Las mejoras opcionales que se detectaron en la auditoría inicial
(caché offline con `@capacitor/network`, selector nativo de archivos para
importar Excel, compartir en vez de `window.print()` para etiquetas) **no se
aplicaron** porque requieren editar el código de la web y volver a desplegarla
en Vercel — avísame si las quieres y las implementamos en una segunda pasada.

## Software instalado en este equipo para compilar

Como el equipo no tenía herramientas de Android, se instalaron (con tu
autorización) en `C:\AndroidDev`, sin tocar el sistema global:

- JDK 21 (Eclipse Temurin) → `C:\AndroidDev\jdk21`
- JDK 17 (Eclipse Temurin) → `C:\AndroidDev\jdk17` (usado solo para `sdkmanager`)
- Android SDK command-line tools, platform-tools, `platforms;android-36`,
  `build-tools;36.0.0` → `C:\AndroidDev\Sdk`

Nada se agregó al PATH del sistema ni a variables de entorno permanentes.

## Cómo recompilar después de cambios

El proyecto Capacitor vive en `2c-inventario-next/` (este mismo repo), pero
**la build se corrió desde una copia en `C:\AndroidDev\build\app`**, porque la
ruta original de este proyecto es demasiado larga para Gradle en Windows
(error típico: "el nombre de archivo... no son correctos"). Para recompilar:

```bash
# 1. Sincroniza cambios de Capacitor (si tocaste capacitor.config.ts o plugins)
cd 2c-inventario-next
npx cap sync android

# 2. Copia node_modules + android a una ruta corta
robocopy node_modules C:\AndroidDev\build\app\node_modules /E /MT:16
robocopy android C:\AndroidDev\build\app\android /E /MT:16

# 3. Compila desde la ruta corta
cd C:\AndroidDev\build\app\android
set JAVA_HOME=C:\AndroidDev\jdk21
gradlew.bat assembleDebug

# 4. El APK queda en:
# C:\AndroidDev\build\app\android\app\build\outputs\apk\debug\app-debug.apk
```

Alternativa más simple a futuro: mover este proyecto a una ruta corta sin
espacios (ej. `C:\Proyectos\2c-inventario-next`) para compilar directo, sin el
paso de copiar a `C:\AndroidDev\build`.

### Para un APK firmado de verdad (listo para Play Store)

Se necesita un keystore de release. Dime si quieres que genere uno de prueba
(`keytool -genkeypair`) o si ya tienes uno, y corremos `assembleRelease`.
