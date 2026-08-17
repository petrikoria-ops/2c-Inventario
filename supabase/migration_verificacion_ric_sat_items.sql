-- =====================================================================
--  Anexo SAT — checklist itemizado por punto (en vez de 5 resultados
--  consolidados por categoría), para que quede tan guiado como el Test de
--  Alimentadores (1 fila por medición, con su propio Pasa/No pasa/N/A).
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  IDEMPOTENTE (IF NOT EXISTS / DROP POLICY IF EXISTS / WHERE NOT EXISTS):
--  se puede re-ejecutar sin romper nada ni duplicar filas.
--
--  Requiere haber corrido antes migration_verificacion_ric_sat.sql
--  (verificaciones_ric_tableros).
--
--  Antes: verificaciones_ric_tableros tenía 5 columnas de resultado fijas
--  (resultado_ensayos_instrumento, resultado_inspeccion,
--  resultado_requisitos_terreno, resultado_puntos_especificos,
--  resultado_registro_fotografico) — un solo Pasa/No pasa/N/A por
--  categoría completa.
--  Ahora: las primeras 4 categorías se itemizan en la tabla nueva
--  verificaciones_ric_tableros_items (1 fila por punto de verificación,
--  cada una con su propio resultado) — igual que
--  pruebas_alimentadores_items. resultado_registro_fotografico NO se
--  itemiza (sigue siendo un solo Pasa/No pasa/N/A + la foto general del
--  tablero, ya en foto_tomada/foto_url).
--
--  Las 5 columnas viejas NO se borran (mismo criterio que
--  identificacion_alimentador en migration_alimentadores_multiples.sql:
--  "no se borra la columna para no perder ese respaldo") — quedan sin
--  usarse desde la UI/print, como dato histórico.
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 1 · Tabla de ítems del Anexo SAT
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verificaciones_ric_tableros_items (
  id                BIGSERIAL PRIMARY KEY,
  tablero_entry_id  BIGINT NOT NULL REFERENCES verificaciones_ric_tableros(id) ON DELETE CASCADE,
  categoria         TEXT NOT NULL CHECK (categoria IN ('ensayos_instrumento', 'inspeccion', 'requisitos_terreno', 'puntos_especificos')),
  orden             INTEGER NOT NULL DEFAULT 0,
  texto             TEXT NOT NULL,
  resultado         TEXT CHECK (resultado IN ('pasa', 'no_pasa', 'na')),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vric_tableros_items_tablero ON verificaciones_ric_tableros_items(tablero_entry_id);
CREATE INDEX IF NOT EXISTS idx_vric_tableros_items_orden   ON verificaciones_ric_tableros_items(tablero_entry_id, categoria, orden);

CREATE OR REPLACE TRIGGER trg_verificaciones_ric_tableros_items_actualizado_en
  BEFORE UPDATE ON verificaciones_ric_tableros_items
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

ALTER TABLE verificaciones_ric_tableros_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON verificaciones_ric_tableros_items;
CREATE POLICY "authenticated_full_access" ON verificaciones_ric_tableros_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 2 · Backfill — tableros ya creados antes de esta migración no
--  tienen ítems todavía. Se generan los 20 ítems fijos (3 ensayos + 7
--  inspección + 10 requisitos de terreno) copiando el resultado
--  consolidado que ya tenían a cada ítem de su categoría (mismo valor
--  para todos — es la mejor aproximación disponible sin volver a
--  preguntar en terreno). Textos idénticos a
--  lib/verificacionRic/anexoSat.ts (NUCLEO_IEC_ENSAYOS/INSPECCION/
--  REQUISITOS_TERRENO_SAT) — si esos textos cambian ahí, actualizar acá
--  también para los tableros que se creen de ahora en adelante (la
--  seed en vivo la hace la API, esto es solo backfill histórico).
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO verificaciones_ric_tableros_items (tablero_entry_id, categoria, orden, texto, resultado)
SELECT t.id, x.categoria, x.orden, x.texto,
  CASE x.categoria
    WHEN 'ensayos_instrumento' THEN t.resultado_ensayos_instrumento
    WHEN 'inspeccion'          THEN t.resultado_inspeccion
    WHEN 'requisitos_terreno'  THEN t.resultado_requisitos_terreno
  END
FROM verificaciones_ric_tableros t
CROSS JOIN (VALUES
  ('ensayos_instrumento', 0, 'Continuidad circuito de protección (cláusula 11.4, criterio ≤ 0,5 Ω)'),
  ('ensayos_instrumento', 1, 'Resistencia de aislamiento (cláusula 11.9.3, criterio ≥ 500 kΩ)'),
  ('ensayos_instrumento', 2, 'Rigidez dieléctrica (HV AC) (cláusula 11.9.2, criterio Sin ruptura a tensión de ensayo (Tabla 8))'),
  ('inspeccion', 0, 'Grado de protección (IP) (cláusula 11.2)'),
  ('inspeccion', 1, 'Distancias de aislamiento y líneas de fuga (cláusula 11.3)'),
  ('inspeccion', 2, 'Incorporación de componentes (cláusula 11.5)'),
  ('inspeccion', 3, 'Circuitos internos y conexiones (torque) (cláusula 11.6)'),
  ('inspeccion', 4, 'Bornes conductores externos (cláusula 11.7)'),
  ('inspeccion', 5, 'Operación mecánica (puertas, enclavamientos) (cláusula 11.8)'),
  ('inspeccion', 6, 'Funcionamiento operacional (mando/señalización) (cláusula 11.10)'),
  ('requisitos_terreno', 0, 'Verificación de que el tablero llegó sin daños de transporte'),
  ('requisitos_terreno', 1, 'Reapriete de conexiones y barras tras transporte (torque)'),
  ('requisitos_terreno', 2, 'Verificación de conexionado a la instalación real (acometida, alimentadores, tierras)'),
  ('requisitos_terreno', 3, 'Medición de resistencia de puesta a tierra del sistema'),
  ('requisitos_terreno', 4, 'Verificación de secuencia y rotación de fases con la red real'),
  ('requisitos_terreno', 5, 'Repetición de aislación y continuidad ya conectado en sitio'),
  ('requisitos_terreno', 6, 'Prueba funcional con alimentación real (control, señalización, alarmas, enclavamientos)'),
  ('requisitos_terreno', 7, 'Si aplica: prueba de transferencia Normal-Emergencia con red y generador reales'),
  ('requisitos_terreno', 8, 'Verificación de identificación/rotulado definitivo y planos as-built'),
  ('requisitos_terreno', 9, 'Registro de condiciones ambientales del sitio si son relevantes')
) AS x(categoria, orden, texto)
WHERE NOT EXISTS (
  SELECT 1 FROM verificaciones_ric_tableros_items i
  WHERE i.tablero_entry_id = t.id AND i.categoria = x.categoria
);

-- Puntos específicos por tipo de tablero — solo para tableros que ya
-- tenían tipo_tablero_id asignado. Textos idénticos a TIPOS_TABLERO en
-- lib/verificacionRic/anexoSat.ts.
INSERT INTO verificaciones_ric_tableros_items (tablero_entry_id, categoria, orden, texto, resultado)
SELECT t.id, 'puntos_especificos', x.orden, x.texto, t.resultado_puntos_especificos
FROM verificaciones_ric_tableros t
CROSS JOIN LATERAL (
  SELECT * FROM (VALUES
    ('banco_condensadores', 0, 'Secuencia de conexión de pasos (steps)'),
    ('banco_condensadores', 1, 'Controlador de reactiva (setpoint cos φ, tiempo de conmutación)'),
    ('banco_condensadores', 2, 'Resistencias de descarga (tensión residual < 50 V tras desconexión)'),
    ('banco_condensadores', 3, 'Ventilación/temperatura del gabinete'),
    ('banco_condensadores', 4, 'Contactores anti-inrush si existen'),
    ('tdf_enchufes', 0, 'Diferenciales 30 mA por circuito (botón test)'),
    ('tdf_enchufes', 1, 'Continuidad de tierra en puntos representativos'),
    ('tdf_enchufes', 2, 'Polaridad fase-neutro-tierra'),
    ('ats_transferencia', 0, 'Prueba de transferencia automática (simular falla de red, tiempo de transferencia)'),
    ('ats_transferencia', 1, 'Enclavamiento mecánico/eléctrico N-E'),
    ('ats_transferencia', 2, 'Secuencia de fases en ambas fuentes'),
    ('ats_transferencia', 3, 'Retransferencia y enfriamiento del generador'),
    ('ats_transferencia', 4, 'Señalización de estado'),
    ('tda_iluminacion', 0, 'Diferenciales por circuito de alumbrado'),
    ('tda_iluminacion', 1, 'Contactores/fotocélulas/control horario'),
    ('tda_iluminacion', 2, 'Circuitos de emergencia o luces de escape si aplica'),
    ('tda_iluminacion', 3, 'Prueba de encendido por sectores'),
    ('clima_ventilacion', 0, 'Térmicas/guardamotor de compresores/ventiladores/extractores'),
    ('clima_ventilacion', 1, 'Contactores/arrancadores (directo, estrella-triángulo, variador)'),
    ('clima_ventilacion', 2, 'Sentido de giro de motores trifásicos'),
    ('clima_ventilacion', 3, 'Enclavamientos de seguridad de extracción de emergencia'),
    ('computacion_data', 0, 'UPS y autonomía si existe'),
    ('computacion_data', 1, 'Tipo de diferencial adecuado a carga electrónica (A o B)'),
    ('computacion_data', 2, 'Tierra dedicada/aislada si el diseño la contempla'),
    ('computacion_data', 3, 'Precaución de desconectar cargas sensibles antes de HV'),
    ('mixto_retail', 0, 'Diferenciales en ambos tipos de circuito'),
    ('mixto_retail', 1, 'Circuitos de cajas/POS si están incluidos'),
    ('mixto_retail', 2, 'Prueba de iluminación decorativa/vitrinas'),
    ('frio_alimentario', 0, 'Térmicas/guardamotor de compresores'),
    ('frio_alimentario', 1, 'Arranque (directo/estrella-triángulo) y sentido de giro'),
    ('frio_alimentario', 2, 'Continuidad de tierra en carcasas metálicas'),
    ('frio_alimentario', 3, 'Alarmas de temperatura/control de cámaras si están conectadas'),
    ('frio_alimentario', 4, 'Protecciones dimensionadas para arranque simultáneo')
  ) AS v(tipo_id, orden, texto)
  WHERE v.tipo_id = t.tipo_tablero_id
) AS x
WHERE t.tipo_tablero_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM verificaciones_ric_tableros_items i
    WHERE i.tablero_entry_id = t.id AND i.categoria = 'puntos_especificos'
  );

-- =====================================================================
--  FIN. Las columnas resultado_ensayos_instrumento, resultado_inspeccion,
--  resultado_requisitos_terreno y resultado_puntos_especificos quedan en
--  verificaciones_ric_tableros sin usarse desde la UI/print (dato
--  histórico, no se borran). resultado_registro_fotografico SÍ se sigue
--  usando tal cual, no se itemiza.
-- =====================================================================
