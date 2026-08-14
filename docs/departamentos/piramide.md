# Pirámide de roles (cross-departamento)

Lee también el `CLAUDE.md` raíz antes de trabajar aquí. Este doc es el
organigrama que cruza todos los departamentos — cada `docs/departamentos/*.md`
sigue siendo la referencia de módulos visibles y reglas específicas de su
departamento, pero el significado de `nivel_acceso` es el mismo en toda la
empresa y vive acá.

## Los 4 escalones (+ `admin_software`, aparte)

| Escalón | nivel_acceso | Quién |
|---|---|---|
| Gerencia | `master` | Gerente *(antes "Dueño")*, Jefe directivo — acceso total, bypasea todo (`NIVELES_TOTALES`) |
| Jefe de departamento / Visitador de obra | `administrador` | Encargado de bodega, Encargado de taller, Jefe de oficina técnica, Prevencionista, Jefe de Recursos Humanos, Jefe ejecutivo, Visitador de obra |
| Supervisor | `modificador` | Supervisor eléctrico, Maestro Mayor, Ayudante de encargado (bodega/taller), Proyectista / ingeniero, Ayudante de jefe de oficina técnica, Asistente de Recursos Humanos, Chofer-bodeguero |
| Maestro / Ayudante | `maestro` | Maestro 1, Maestro 2, Ayudante de maestro, Ayudante de bodega, Bodeguero, Técnico junior / ingeniero junior, Practicante |
| *(fuera de la pirámide)* | `admin_software` | Administrador de software — rol técnico de sistema, no de negocio |

`Maestro` y `Ayudante` comparten el mismo `nivel_acceso` (`maestro`) — no hay
un 5º valor separado para "Ayudante". La diferencia entre ambos está en
cuántos módulos y acciones tiene habilitados cada *puesto* en
`permisos_puesto` (editable desde `/admin/permisos`), no en el nivel.

## `administrador` / `modificador` / `maestro` NO son bypass de código

A diferencia de `master` y `admin_software` (los únicos dos valores en
`NIVELES_TOTALES`, `lib/auth/permisos.ts`), estos 3 escalones son solo el
*nombre* del lugar que ocupa un puesto en la pirámide — el acceso real a
cada módulo (`ver`/`crear`/`modificar`/`eliminar`) sigue viniendo 100% de
`permisos_puesto` (por puesto) y `permisos_usuario_overrides` (excepción
por persona), exactamente igual que antes de que existiera esta pirámide.

**No agregues `'administrador'`, `'modificador'` ni `'maestro'` a
`NIVELES_TOTALES`** — eso los convertiría en bypass total (ven y editan
todo, en todos los departamentos), que no es lo que la pirámide representa.
Si algún día alguien de negocio pide eso explícitamente para un escalón,
es una decisión aparte, no una consecuencia automática de subir en la
pirámide.

## El permiso `eliminar`, separado de `modificar`

Desde `migration_piramide_roles.sql`, cada módulo tiene 4 acciones
independientes por puesto: `ver`, `crear`, `modificar`, `eliminar`. Antes,
"eliminar" vivía implícito dentro de "modificar" (cualquier ruta `DELETE`
llamaba a `requireModificar`). Esto permite, por ejemplo, que el tier
Supervisor (`modificador`) pueda agregar/editar registros sin poder borrar
los mismos módulos que sí puede borrar un `administrador` — el dueño ajusta
esa matriz módulo por módulo desde `/admin/permisos`, sin tocar código.

## Quién ve los controles de "estructurar" vs. "marcar" en Avance de obra

Ver el detalle en `docs/departamentos/directiva.md` — el resumen es que
`puedeMarcarAvance(perfil)` (`lib/auth/permisos.ts`) le da a los puestos de
terreno de Taller (`Maestro 1`, `Maestro 2`, `Maestro Mayor`) la capacidad
de tildar una etapa como completada sin poder estructurar el plan
(agregar/editar/borrar etapas), que sigue reservado a quien tenga
`modificar` real en el módulo `avance_obra`.

## "Ver como" y el orden de la pirámide

`lib/auth/verComo.ts` usa `ORDEN_NIVEL` (`maestro: 0, modificador: 1,
administrador: 2, master: 3, admin_software: 4`) para elegir, al simular un
departamento, el puesto de mayor jerarquía de ese departamento (siempre
existe uno `administrador`, salvo que se haya usado la alternativa donde
"Encargado de taller" cae en `modificador` — en ese caso el fallback
`.reduce()` elige el `modificador` de mayor rango disponible).

Esta misma noción de orden es la que reutilizará una futura función
`puedeAsignar(asignador, asignado)` (cuando se construya la asignación de
tareas/inspecciones) para decidir "quién puede asignarle una tarea a
quién" — generalmente, alguien solo puede asignar a otra persona en su
mismo escalón o por debajo.

## Quién ve "quién está conectado"

`puedeVerConectados(perfil)` (`lib/auth/permisos.ts`) — jefatura desde
Visitador de obra hacia arriba (`administrador`/`master`/`admin_software`).
Gatea el panel "Quién está conectado" del Inicio y el punto verde/gris de
la mensajería (`contexts/PresenceContext.tsx`, `components/mensajeria/`).
El resto de la empresa (Supervisor, Maestro, Ayudante) sigue pudiendo
mandar y recibir mensajes con total normalidad — solo no ve el estado de
conexión de nadie, porque tenerlo abierto a todo nivel se sintió invasivo
para quien hace el trabajo de terreno.
