# Departamento: Bodega

Lee también el `CLAUDE.md` raíz (stack, arquitectura, patrones generales) antes de trabajar aquí.

## Roles

| Puesto | nivel_acceso |
|---|---|
| Ayudante de bodega | `visualizacion` |
| Chofer-bodeguero | `operador` |
| Encargado de bodega | `encargado` |
| Ayudante de encargado | `operador` |

## Módulos visibles

| Módulo | Acceso |
|---|---|
| Materiales | completo (según nivel) |
| Herramientas / Entregar herramientas | completo |
| Movimientos / Salidas / Entrega por mano | completo |
| Importar / Proveedores | completo |
| Compras (Solicitudes) | completo |
| Etiquetas de obra | completo |
| Agente IA | completo |
| Obras activas (Proyectos) | lectura |
| Métricas | solo `encargado` o superior |

`materiales` es hoy el único módulo con el patrón de permisos completo (UI + API, ver `requireEditable('materiales')`). Para el resto, la UI no oculta todavía botones de edición por nivel — pendiente de aplicar el mismo patrón.

## Pendiente / reglas específicas

- [ ] Replicar `editable`/`requireEditable` en Herramientas, Movimientos, Salidas, Proveedores, Compras y Etiquetas.
- [ ] Confirmar con el dueño del negocio si "Ayudante de encargado" debería tener algún permiso que "Chofer-bodeguero" no tenga (hoy están igualados en `operador`).
