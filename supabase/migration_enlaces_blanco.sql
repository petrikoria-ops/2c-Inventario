-- =====================================================================
--  Enlaces "en blanco" — permite generar un link SIN una verificación ya
--  creada, para que la persona externa cree el registro desde cero (obra,
--  cliente, ubicación, checklist, todo). Antes, enlaces_publicos.registro_id
--  siempre apuntaba a un registro ya existente (alguien interno lo creaba
--  primero y compartía el link solo para completar/firmar).
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  Requiere haber corrido antes migration_enlaces_publicos.sql.
--  IDEMPOTENTE: se puede re-ejecutar sin romper nada.
--
--  La obra que tipea la persona externa NO queda vinculada a un proyecto
--  real del sistema (queda solo como texto en proyecto_nombre / centro_trabajo,
--  columnas que ya existían y ya eran de texto libre) — alguien interno
--  puede vincularla a una obra real después desde el detalle del registro.
-- =====================================================================

ALTER TABLE enlaces_publicos ALTER COLUMN registro_id DROP NOT NULL;

-- =====================================================================
--  FIN. registro_id = NULL identifica un enlace "en blanco" todavía sin
--  usar; se completa la primera vez que alguien lo abre y crea el registro
--  (ver /api/publico/[token]/crear), y desde ahí en adelante funciona
--  exactamente igual que un enlace que apuntaba a un registro ya existente.
-- =====================================================================
