# Departamento: Directiva

Lee también el `CLAUDE.md` raíz antes de trabajar aquí.

## Roles

| Puesto | nivel_acceso |
|---|---|
| Dueño | `master` (acceso total) |
| Jefe directivo | `master` (acceso total) |
| Jefe ejecutivo | `directiva` (lectura total, sin edición operativa) |
| Supervisor eléctrico | `jefe_departamento` (cross-depto: Bodega + Taller + Oficina Técnica) |
| Ingeniero visitante | `visualizacion` (acceso temporal) |

## Módulos visibles

`master` ve y edita todo, en todos los departamentos — no hay restricción de módulo para ese nivel (ver `lib/auth/permisos.ts`, `NIVELES_TOTALES`).

Para `directiva` (lectura total):

| Módulo | Acceso |
|---|---|
| Materiales, Herramientas, Movimientos, Proveedores, Compras, Trabajadores, Proyectos | lectura |
| Métricas | completo |
| Agente IA | completo |

`Supervisor eléctrico` todavía usa el mapa genérico de `directiva` — falta implementar el acceso cross-departamento real (Bodega + Taller + Oficina Técnica con nivel `jefe_departamento`), ya que el modelo actual asume un usuario = un departamento.

## Pendiente / reglas específicas

- [ ] Implementar acceso multi-departamento para "Supervisor eléctrico" (hoy el modelo de `perfiles` solo permite un departamento por usuario).
- [ ] Confirmar si "Ingeniero visitante" necesita expiración automática de su cuenta (acceso temporal real, no solo nominal).
