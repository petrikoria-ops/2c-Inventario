-- =====================================================================
--  Prevención de Riesgos — Inspección de faena (checklist DS 594)
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  Todo es IDEMPOTENTE (IF NOT EXISTS / DROP POLICY IF EXISTS): se puede
--  re-ejecutar sin romper nada. Corre las 3 secciones EN ORDEN.
--
--  Después de correr esto en Supabase, hay que crear el bucket de
--  Storage "prevencion-riesgos" (Sección 2) — si el INSERT directo a
--  storage.buckets falla por permisos, crearlo a mano desde
--  Dashboard → Storage → New bucket → nombre "prevencion-riesgos",
--  Public = NO, y luego correr solo las policies de la Sección 2.
--
--  Portado desde la skill kit-prevencionista-riesgos (referencia/*.json)
--  — ver lib/prevencion/*.ts para las constantes equivalentes en código.
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 1 · Inspecciones de faena + ítems (checklist DS 594) +
--  catálogo de hallazgos estándar
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspecciones_prevencion (
  id                      BIGSERIAL PRIMARY KEY,
  numero                  TEXT NOT NULL UNIQUE,          -- INSP-2026-001
  proyecto_id             BIGINT REFERENCES proyectos(id) ON DELETE SET NULL,
  centro_trabajo          TEXT NOT NULL,
  direccion               TEXT,
  comuna                  TEXT,
  mandante                TEXT,
  lugares_inspeccionados  TEXT,
  fecha                   DATE NOT NULL DEFAULT CURRENT_DATE,
  prevencionista          TEXT,
  dirigido_a              TEXT,
  n_trabajadores          TEXT,
  introduccion            TEXT,
  observaciones_generales TEXT,
  firma_prevencionista    TEXT,
  firma_encargado         TEXT,
  estado                  TEXT NOT NULL DEFAULT 'en_progreso'
                            CHECK (estado IN ('en_progreso', 'completa')),
  creado_por              UUID REFERENCES auth.users(id),
  creado_en               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Catálogo de hallazgos estándar — vive independiente de cada inspección
-- y crece con el tiempo (mismo hallazgo, misma respuesta reutilizada).
-- Portado desde referencia/catalogo-hallazgos.json.
CREATE TABLE IF NOT EXISTS catalogo_hallazgos (
  id            TEXT PRIMARY KEY,          -- 'HZ-001'…
  checklist_n   INTEGER,                   -- n del checklist DS 594, si aplica (null = hallazgo libre)
  categoria     TEXT,
  keywords      TEXT[] NOT NULL DEFAULT '{}',
  diagnostico   TEXT NOT NULL,
  tipo          TEXT,
  riesgo        TEXT,
  nivel         TEXT CHECK (nivel IN ('CRITICO', 'ALTO', 'MEDIO', 'BAJO')),
  norma         TEXT,
  medidas_mp    TEXT[] NOT NULL DEFAULT '{}',
  medida_texto  TEXT,
  origen        TEXT,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Checklist DS 594 + hallazgos, unificados: un ítem marcado 'no_cumple'
-- ES el hallazgo (sin tabla ni sincronización aparte). n=null identifica
-- un hallazgo libre agregado fuera de los 33 ítems base (detectado en
-- foto, sin pregunta de checklist asociada).
CREATE TABLE IF NOT EXISTS inspecciones_prevencion_items (
  id              BIGSERIAL PRIMARY KEY,
  inspeccion_id   BIGINT NOT NULL REFERENCES inspecciones_prevencion(id) ON DELETE CASCADE,
  n               INTEGER,                 -- n del checklist DS 594; null = hallazgo adicional libre
  item            TEXT NOT NULL,           -- pregunta del checklist, o diagnóstico si es libre
  categoria       TEXT,
  resultado       TEXT CHECK (resultado IN ('cumple', 'no_cumple', 'na')),
  detalle         TEXT,
  nivel           TEXT CHECK (nivel IN ('CRITICO', 'ALTO', 'MEDIO', 'BAJO')),
  norma           TEXT,
  medidas_mp      TEXT[] NOT NULL DEFAULT '{}',
  medida_texto    TEXT,
  responsable     TEXT,
  plazo           TEXT,
  catalogo_id     TEXT REFERENCES catalogo_hallazgos(id) ON DELETE SET NULL,
  foto_url        TEXT,                    -- path en Storage, nunca URL firmada
  orden           INTEGER NOT NULL DEFAULT 0,
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insp_prev_items_inspeccion ON inspecciones_prevencion_items(inspeccion_id);
CREATE INDEX IF NOT EXISTS idx_insp_prev_items_orden      ON inspecciones_prevencion_items(inspeccion_id, orden);
CREATE INDEX IF NOT EXISTS idx_insp_prev_proyecto         ON inspecciones_prevencion(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_catalogo_hallazgos_checklist_n ON catalogo_hallazgos(checklist_n);

CREATE OR REPLACE TRIGGER trg_inspecciones_prevencion_actualizado_en
  BEFORE UPDATE ON inspecciones_prevencion
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

CREATE OR REPLACE TRIGGER trg_inspecciones_prevencion_items_actualizado_en
  BEFORE UPDATE ON inspecciones_prevencion_items
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 2 · Storage para evidencia fotográfica
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('prevencion-riesgos', 'prevencion-riesgos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "authenticated_select_prevencion_riesgos" ON storage.objects;
CREATE POLICY "authenticated_select_prevencion_riesgos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'prevencion-riesgos');

DROP POLICY IF EXISTS "authenticated_insert_prevencion_riesgos" ON storage.objects;
CREATE POLICY "authenticated_insert_prevencion_riesgos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'prevencion-riesgos');

DROP POLICY IF EXISTS "authenticated_update_prevencion_riesgos" ON storage.objects;
CREATE POLICY "authenticated_update_prevencion_riesgos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'prevencion-riesgos') WITH CHECK (bucket_id = 'prevencion-riesgos');

DROP POLICY IF EXISTS "authenticated_delete_prevencion_riesgos" ON storage.objects;
CREATE POLICY "authenticated_delete_prevencion_riesgos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'prevencion-riesgos');


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 3 · RLS en las 3 tablas nuevas
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'inspecciones_prevencion', 'inspecciones_prevencion_items', 'catalogo_hallazgos'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_full_access" ON %I;', t);
    EXECUTE format(
      'CREATE POLICY "authenticated_full_access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      t
    );
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 4 · Siembra del catálogo de 37 hallazgos estándar
--  (portado desde referencia/catalogo-hallazgos.json — solo una vez;
--  ON CONFLICT DO NOTHING para que re-ejecutar la migración no duplique)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO catalogo_hallazgos (id, checklist_n, categoria, keywords, diagnostico, tipo, riesgo, nivel, norma, medidas_mp, medida_texto, origen) VALUES
('HZ-001', 1, 'Riesgo eléctrico', ARRAY['toma','tomacorriente','enchufe pared','deteriorado'], 'Tomas de corriente en mal estado / deterioradas', 'Condición subestándar', 'Contacto eléctrico directo o indirecto; cortocircuito e incendio.', 'ALTO', 'Normativa eléctrica SEC (Pliegos RIC) y DS 594 (MINSAL) (verificar versión/artículo vigente).', ARRAY['MP-15','MP-13'], 'Reparar o reemplazar las tomas de corriente dañadas y señalizar/restringir el punto hasta su corrección.', NULL),
('HZ-002', 2, 'Riesgo eléctrico', ARRAY['enchufe','cableado','equipo','deteriorado'], 'Enchufes o cableado de equipos deteriorados', 'Condición subestándar', 'Contacto eléctrico e incendio por falla en el equipo.', 'ALTO', 'Normativa eléctrica SEC (Pliegos RIC) y DS 594 (MINSAL) (verificar versión/artículo vigente).', ARRAY['MP-15','MP-12'], 'Reparar o reemplazar enchufes y cableado deteriorados; retirar de servicio el equipo hasta su corrección.', NULL),
('HZ-003', 3, 'Riesgo eléctrico', ARRAY['cable','a la vista','expuesto','tropiezo'], 'Cables a la vista que generan riesgo', 'Condición subestándar', 'Contacto eléctrico y/o tropiezo y caída a nivel.', 'ALTO', 'Normativa eléctrica SEC (Pliegos RIC) y DS 594 (MINSAL) (verificar versión/artículo vigente).', ARRAY['MP-12','MP-13'], 'Canalizar u ordenar el cableado expuesto y demarcar la zona mientras se corrige.', NULL),
('HZ-004', 4, 'Infraestructura', ARRAY['techo','filtracion','gotera','humedad'], 'Techo con filtraciones', 'Condición subestándar', 'Piso húmedo (caída a nivel), contacto agua-electricidad y daño a materiales.', 'MEDIO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Reparar la filtración del techo y proteger equipos e instalaciones bajo la zona afectada.', NULL),
('HZ-005', 5, 'Orden y aseo', ARRAY['piso','irregular','sobresale','desnivel'], 'Piso irregular o con elementos que sobresalen', 'Condición subestándar', 'Caída a nivel / tropiezo.', 'MEDIO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12','MP-16'], 'Nivelar o reparar el piso, retirar los elementos que sobresalen y mantener despejada la superficie de tránsito.', NULL),
('HZ-006', 6, 'Orden y aseo', ARRAY['desorden','obstaculo','transito','pasillo'], 'Interior con desorden u obstáculos que impiden el tránsito', 'Condición subestándar', 'Caída a nivel, golpes y obstrucción de vías de tránsito/evacuación.', 'MEDIO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-16','MP-13'], 'Despejar y ordenar las vías de tránsito; demarcar pasillos y mantener el orden y aseo del área.', NULL),
('HZ-007', 7, 'Orden y aseo', ARRAY['exterior','basura','acumulacion','residuos'], 'Exterior con acumulación de basura / desorden', 'Condición subestándar', 'Proliferación de vectores, caídas y riesgo de incendio.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-16'], 'Retirar la basura y mantener el aseo del área exterior según programa.', NULL),
('HZ-008', 8, 'Infraestructura', ARRAY['iluminacion','luz','luminaria','oscuro'], 'Iluminación interior deficiente', 'Condición subestándar', 'Caídas, golpes y fatiga visual por baja iluminación.', 'MEDIO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Reponer o reforzar luminarias hasta alcanzar el nivel de iluminación adecuado a la tarea.', NULL),
('HZ-009', 9, 'Trabajo en altura', ARRAY['contenedor','segundo piso','escalera','baranda','altura'], 'Acceso a contenedor en altura sin escalera y/o baranda', 'Condición subestándar', 'Caída de distinto nivel (altura).', 'ALTO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12','MP-13'], 'Habilitar escalera y baranda de acceso normalizadas; señalizar el riesgo de caída de altura.', NULL),
('HZ-010', 10, 'Agua y saneamiento', ARRAY['agua potable','suministro','sin agua'], 'Sin suministro de agua potable en la faena', 'Condición subestándar', 'Afectación a la salud e higiene; incumplimiento sanitario.', 'ALTO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12','MP-08'], 'Gestionar el suministro de agua potable en la faena y notificar a jefatura para su provisión inmediata.', NULL),
('HZ-011', 11, 'Bienestar', ARRAY['ducha','sexo','agua caliente','insuficiente'], 'Duchas insuficientes, sin separación por sexo o sin agua caliente', 'Condición subestándar', 'Condición sanitaria y de bienestar deficiente.', 'MEDIO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Habilitar duchas separadas por sexo, con agua fría y caliente, en cantidad suficiente.', NULL),
('HZ-012', 12, 'Bienestar', ARRAY['ducha','artefacto','llave','cortina'], 'Artefactos de ducha en mal estado', 'Condición subestándar', 'Condición sanitaria deficiente; cortes o resbalones.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Reparar o reponer los artefactos de ducha (llave, ducha, cortina).', NULL),
('HZ-013', 13, 'Higiene', ARRAY['ducha','limpieza','aseo','sucia'], 'Duchas en condiciones deficientes de aseo', 'Condición subestándar', 'Condición higiénica deficiente; proliferación de vectores.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-16'], 'Establecer rutina de limpieza y mantener las duchas en condiciones de aseo.', NULL),
('HZ-014', 14, 'Gas / seguridad', ARRAY['calentador','gas','ventilacion','recinto','CO'], 'Calentador a gas dentro de recinto o sin ventilación', 'Condición subestándar', 'Intoxicación por monóxido de carbono (CO) o explosión.', 'ALTO', 'DS 594 (MINSAL) y normativa SEC (instalaciones de gas/eléctricas) (verificar versión/artículo vigente).', ARRAY['MP-12','MP-13'], 'Reubicar el calentador a gas fuera del recinto, con ventilación adecuada; verificar hermeticidad y señalizar.', NULL),
('HZ-015', 15, 'Agua y saneamiento', ARRAY['baño','sexo','vectores','separacion'], 'Baños sin separación por sexo o expuestos a vectores', 'Condición subestándar', 'Condición sanitaria deficiente.', 'MEDIO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Separar los baños por sexo y protegerlos del ingreso de vectores.', NULL),
('HZ-016', 16, 'Higiene', ARRAY['baño','jabon','papel','agua'], 'Baños sin agua, jabón o papel', 'Condición subestándar', 'Condición higiénica deficiente.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Dotar los baños de agua, jabón y papel de forma permanente.', NULL),
('HZ-017', 17, 'Higiene', ARRAY['baño','artefacto','wc','lavamanos','cadena'], 'Artefactos de baño en mal estado', 'Condición subestándar', 'Condición sanitaria deficiente.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Reparar o reponer los artefactos de baño (WC, cadena, llave, lavamanos).', NULL),
('HZ-018', 18, 'Higiene', ARRAY['baño','limpieza','aseo','sucio'], 'Baños en condiciones deficientes de aseo', 'Condición subestándar', 'Condición higiénica deficiente; proliferación de vectores.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-16'], 'Establecer rutina de limpieza y mantener los baños en condiciones de aseo.', NULL),
('HZ-019', 19, 'Señalética', ARRAY['señaletica','lavado de manos','higiene'], 'Sin señalética de correcto lavado de manos', 'Condición subestándar', 'Higiene deficiente.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-13'], 'Instalar señalética de correcto lavado de manos en los servicios higiénicos.', NULL),
('HZ-020', 20, 'Agua y saneamiento', ARRAY['baño quimico','descarga','vaciado','programa'], 'Baños químicos sin programa de descarga/vaciado', 'Condición subestándar', 'Condición sanitaria deficiente.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-19'], 'Definir y registrar la frecuencia de descarga/vaciado de los baños químicos.', NULL),
('HZ-021', 21, 'Bienestar', ARRAY['vestidor','sexo','clima','desprotegido'], 'Vestidores insuficientes o desprotegidos', 'Condición subestándar', 'Condición de bienestar deficiente.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Habilitar vestidores por sexo, limpios y protegidos del clima.', NULL),
('HZ-022', 22, 'Bienestar', ARRAY['casillero','ventilado','insuficiente'], 'Casilleros insuficientes o en mal estado', 'Condición subestándar', 'Condición de bienestar deficiente.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Proveer casilleros ventilados en número igual al total de trabajadores.', NULL),
('HZ-023', 23, 'Comedor', ARRAY['comedor','aislado','vectores','contaminacion'], 'Comedor no aislado o expuesto a contaminación/vectores', 'Condición subestándar', 'Contaminación de alimentos; proliferación de vectores.', 'MEDIO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Aislar el comedor de las áreas de trabajo y protegerlo del ingreso de vectores.', NULL),
('HZ-024', 24, 'Higiene', ARRAY['comedor','limpieza','aseo','sucio'], 'Comedor en condiciones deficientes de aseo', 'Condición subestándar', 'Condición higiénica deficiente.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-16'], 'Establecer rutina de limpieza y mantener el comedor aseado.', NULL),
('HZ-025', 25, 'Comedor', ARRAY['comedor','mesa','silla','piso','lavable'], 'Mobiliario o piso del comedor inadecuado', 'Condición subestándar', 'Condición higiénica deficiente.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Dotar el comedor de mesas y sillas lavables y piso sólido de fácil limpieza.', NULL),
('HZ-026', 26, 'Comedor', ARRAY['comedor','refrigerador','lavaplatos'], 'Comedor sin refrigerador y/o lavaplatos', 'Condición subestándar', 'Condición de bienestar deficiente; conservación de alimentos.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Proveer refrigerador y lavaplatos en el comedor.', NULL),
('HZ-027', 27, 'Emergencia', ARRAY['evacuacion','señaletica','via de escape','emergencia'], 'Sin señalética de vías de evacuación', 'Condición subestándar', 'Demora o confusión en la evacuación ante una emergencia.', 'ALTO', 'DS 594 (MINSAL) y NCh 2189 — señalización de vías de evacuación (verificar versión/artículo vigente).', ARRAY['MP-13'], 'Instalar señalética de vías de evacuación conforme a la norma de señalización de seguridad.', NULL),
('HZ-028', 28, 'Señalética', ARRAY['epp','señaletica','uso obligatorio','proteccion'], 'Sin señalética de uso obligatorio de EPP', 'Condición subestándar', 'Exposición por no uso de elementos de protección personal.', 'MEDIO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-13'], 'Instalar señalética de uso obligatorio de EPP en accesos y áreas de trabajo.', NULL),
('HZ-029', 29, 'Emergencia', ARRAY['extintor','obstruido','acceso','operativo'], 'Extintores obstruidos, en mal estado o de difícil acceso', 'Condición subestándar', 'Demora en el control de un amago de incendio.', 'ALTO', 'NCh 1433 y DS 594 (MINSAL) — extintores portátiles (verificar versión/artículo vigente).', ARRAY['MP-12','MP-13'], 'Despejar y dejar operativos los extintores, con acceso libre y señalizado.', NULL),
('HZ-030', 30, 'Emergencia', ARRAY['extintor','cantidad','insuficiente','dotacion'], 'Cantidad de extintores insuficiente para la faena', 'Condición subestándar', 'Cobertura insuficiente ante un incendio.', 'ALTO', 'NCh 1433 y DS 594 (MINSAL) — extintores portátiles (verificar versión/artículo vigente).', ARRAY['MP-12'], 'Completar la dotación de extintores según la carga de fuego y la superficie de la faena.', NULL),
('HZ-031', 31, 'Emergencia', ARRAY['extintor','mantencion','certificacion','vencido','recarga'], 'Extintores con mantención/certificación vencida', 'Condición subestándar', 'Falla del extintor al momento de una emergencia.', 'MEDIO', 'NCh 1433 y DS 594 (MINSAL) — extintores portátiles (verificar versión/artículo vigente).', ARRAY['MP-15'], 'Gestionar la recarga y certificación vigente de los extintores.', NULL),
('HZ-032', 32, 'Emergencia', ARRAY['extintor','señaletica','ubicacion'], 'Extintores sin señalética de ubicación', 'Condición subestándar', 'Dificultad para localizar el extintor ante una emergencia.', 'MEDIO', 'NCh 1433 — ubicación y señalización de extintores portátiles (verificar versión vigente).', ARRAY['MP-13'], 'Instalar la señalética de ubicación de los extintores a la altura reglamentaria.', NULL),
('HZ-033', 33, 'Orden y aseo', ARRAY['fumadores','zona','colillas','comedor'], 'Zona de fumadores sin señalizar, sin depósito o cercana al comedor', 'Condición subestándar', 'Incendio y contaminación del comedor.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-13'], 'Señalizar la zona de fumadores, dotarla de depósito de colillas y alejarla del comedor.', NULL),
('HZ-034', 9, 'Trabajo en altura', ARRAY['puerta','vacio','altura','segundo piso','caida'], 'Puerta abierta hacia el vacío en altura sin señalética ni protección', 'Condición subestándar', 'Caída de distinto nivel (altura).', 'ALTO', 'DS 594 (MINSAL) — prevención de caídas de altura y señalización (verificar artículo y versión vigente).', ARRAY['MP-13','MP-12','MP-01'], 'Instalar señalética de peligro de caída de altura, uso obligatorio de arnés y de casco con barbiquejo, y de mantener la puerta cerrada; habilitar baranda o resguardo. Reinstruir al personal.', 'demo-inspeccion 2026-06-25'),
('HZ-035', NULL, 'Almacenamiento', ARRAY['carga','apilada','carrete','estiba','caida de objetos'], 'Cargas en altura mal apiladas o carretes mal estibados', 'Condición subestándar', 'Caída de objetos sobre personas.', 'MEDIO', 'DS 594 (MINSAL) — almacenamiento seguro y orden (verificar artículo y versión vigente).', ARRAY['MP-16','MP-12'], 'Apilar y estibar de forma segura, ubicar los carretes a baja altura, usar film de contención y ordenar los materiales sueltos.', 'demo-inspeccion 2026-06-25'),
('HZ-036', 32, 'Emergencia', ARRAY['extintor','piso','suelo','sin soporte','altura'], 'Extintores ubicados en el piso', 'Condición subestándar', 'Demora en el acceso al extintor ante una emergencia; deterioro del equipo.', 'BAJO', 'NCh 1433 — ubicación y señalización de extintores (verificar versión vigente; base no inferior a 0,20 m y parte superior máx. 1,30 m).', ARRAY['MP-12','MP-13'], 'Montar los extintores en soporte a la altura reglamentaria e instalar la señalética de ubicación correspondiente.', 'demo-inspeccion 2026-06-25'),
('HZ-037', 28, 'Almacenamiento', ARRAY['rack','bodega','señaletica','casco','calzado','caida de objetos'], 'Falta de señalética en racks de bodega (riesgo de caída de objetos y uso de EPP)', 'Condición subestándar', 'Caída de materiales almacenados en altura — lesiones en cabeza, cara y/o pies.', 'MEDIO', 'DS 594 (MINSAL) — condiciones de seguridad y señalización (verificar artículo y versión vigente).', ARRAY['MP-13','MP-01'], 'Instalar señalética en racks y accesos de bodega indicando el riesgo de caída de materiales y el uso obligatorio de casco y calzado de seguridad. Reinstruir al personal sobre el uso de EPP.', 'demo-inspeccion 2026-06-25')
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
--  FIN.
-- =====================================================================
