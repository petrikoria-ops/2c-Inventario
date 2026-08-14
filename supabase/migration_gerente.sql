-- =====================================================================
--  Renombra el puesto "Dueño" a "Gerente" (nivel_acceso master, sin cambio)
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  Cambio acotado a propósito: NO toca "Jefe directivo" (sigue igual),
--  ni ninguna otra tabla — "Dueño" nunca tuvo filas en permisos_puesto
--  (los puestos master/admin_software bypasean todo por nivel_acceso, no
--  por la tabla de permisos, ver migration_permisos_granulares.sql).
--  Idempotente: re-ejecutarla no hace nada si ya no queda ningún "Dueño".
-- =====================================================================

UPDATE perfiles SET puesto = 'Gerente'
  WHERE departamento = 'directiva' AND puesto = 'Dueño';

-- =====================================================================
--  FIN.
-- =====================================================================
