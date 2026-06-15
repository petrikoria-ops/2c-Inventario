-- ══════════════════════════════════════════════════════════════
-- Datos de ejemplo — 2C Electricidad
-- Ejecutar DESPUÉS de schema.sql en: Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════

-- Limpiar datos previos si se re-ejecuta
TRUNCATE movimientos, herramientas, materiales, proyectos, proveedores, categorias RESTART IDENTITY CASCADE;

-- ─── CATEGORÍAS ────────────────────────────────────────────────
INSERT INTO categorias (nombre, color) VALUES
  ('Conductores y Cables',        '#e74c3c'),
  ('Canalizaciones',              '#e67e22'),
  ('Borneras y Terminales',       '#f39c12'),
  ('Protecciones',                '#2ecc71'),
  ('Contactores y Relés',         '#1abc9c'),
  ('Riel DIN y Accesorios',       '#3498db'),
  ('Prensaestopas y Sellos',      '#9b59b6'),
  ('Canaletas y Perfiles',        '#95a5a6'),
  ('Iluminación y Señalética',    '#f1c40f'),
  ('Medición e Instrumentación',  '#16a085'),
  ('Otros',                       '#7f8c8d');

-- ─── PROVEEDORES ───────────────────────────────────────────────
INSERT INTO proveedores (nombre, rut, contacto, telefono, email, direccion, plazo_dias, notas) VALUES
  ('Electro Sur S.A.',       '76.543.210-8', 'Pedro Araya',    '+56 2 2345 6789', 'ventas@electrosur.cl',           'Av. Matucana 1234, Santiago',           3, 'Proveedor principal de conductores y protecciones'),
  ('Schneider Electric Chile','76.100.234-5','Claudia Muñoz', '+56 2 2987 6543', 'cl.ventas@schneider-electric.com','Av. del Valle 601, Huechuraba',         5, 'Contactores, variadores, protecciones industriales'),
  ('Aesimac',                '78.654.321-K', 'Rodrigo Fuentes','+56 2 2234 5678', 'ventas@aesimac.cl',              'Vivaceta 834, Santiago',                2, 'Borneras Phoenix Contact, rieles DIN, accesorios'),
  ('Wago Elektro Chile',     '77.321.456-2', 'Ana Carrasco',   '+56 2 2111 3344', 'chile@wago.com',                 'Marchant Pereira 150, Providencia',     7, 'Borneras WAGO y conectores especiales');

-- ─── MATERIALES ────────────────────────────────────────────────
INSERT INTO materiales (codigo,descripcion,categoria_id,unidad,stock_actual,stock_minimo,ubicacion,precio_unitario,proveedor_id) VALUES
-- Conductores (cat 1)
  ('CON-001','Cable THHN 1x1.5 mm² azul',         1,'MT', 250,50,'Est.A/Cajón 1',    520,1),
  ('CON-002','Cable THHN 1x2.5 mm² rojo',         1,'MT', 180,50,'Est.A/Cajón 1',    780,1),
  ('CON-003','Cable THHN 1x4 mm² negro',           1,'MT', 120,30,'Est.A/Cajón 2',   1180,1),
  ('CON-004','Cable THHN 1x6 mm² verde/amarillo',  1,'MT',  90,20,'Est.A/Cajón 2',   1650,1),
  ('CON-005','Cable THHN 1x10 mm² negro',          1,'MT',  60,15,'Est.A/Cajón 3',   2700,1),
  ('CON-006','Cable THHN 1x16 mm² negro',          1,'MT',  40,10,'Est.A/Cajón 3',   4100,1),
  ('CON-007','Cable THHN 1x25 mm² negro',          1,'MT',   8,10,'Est.A/Cajón 3',   6300,1),
  ('CON-008','Cable control 4x1.5 mm²',            1,'MT',  80,20,'Est.A/Cajón 4',   1900,1),
-- Borneras (cat 3)
  ('BOR-001','Bornera Phoenix UK 2.5N azul',       3,'UN', 350,100,'Est.B/Cajón 1',    890,3),
  ('BOR-002','Bornera Phoenix UK 2.5N gris',       3,'UN', 280,100,'Est.B/Cajón 1',    890,3),
  ('BOR-003','Bornera Phoenix UK 4N gris',         3,'UN', 120, 50,'Est.B/Cajón 2',   1150,3),
  ('BOR-004','Bornera WAGO 2273-202 (4mm²)',       3,'UN',  50, 30,'Est.B/Cajón 2',    680,4),
  ('BOR-005','Terminal ferrule 1x1.5mm² rojo',     3,'UN',1000,200,'Est.B/Cajón 3',     45,3),
  ('BOR-006','Terminal ferrule 1x2.5mm² azul',     3,'UN', 800,200,'Est.B/Cajón 3',     65,3),
  ('BOR-007','Puente bornera UK 2.5 (10 polos)',   3,'UN',  15,  5,'Est.B/Cajón 4',   2200,3),
-- Protecciones (cat 4)
  ('PRO-001','Automático 1P 10A Schneider iC60N',  4,'UN',   8,  5,'Est.C/Cajón 1', 18500,2),
  ('PRO-002','Automático 1P 16A Schneider iC60N',  4,'UN',  12,  5,'Est.C/Cajón 1', 18500,2),
  ('PRO-003','Automático 2P 10A Schneider iC60N',  4,'UN',   6,  5,'Est.C/Cajón 1', 28900,2),
  ('PRO-004','Automático 3P 16A Schneider iC60N',  4,'UN',   4,  5,'Est.C/Cajón 2', 42000,2),
  ('PRO-005','Automático 3P 25A Schneider iC60N',  4,'UN',   3,  5,'Est.C/Cajón 2', 45500,2),
  ('PRO-006','Diferencial 2P 25A 30mA Schneider',  4,'UN',   5,  3,'Est.C/Cajón 3', 38000,2),
  ('PRO-007','Diferencial 4P 40A 30mA Schneider',  4,'UN',   3,  2,'Est.C/Cajón 3', 72000,2),
  ('PRO-008','Fusible NH tamaño 0 200A 500V',      4,'UN',   6,  4,'Est.C/Cajón 4', 15800,1),
-- Contactores (cat 5)
  ('COT-001','Contactor Schneider LC1D09 9A 220V', 5,'UN',   4,  2,'Est.D/Cajón 1', 65000,2),
  ('COT-002','Contactor Schneider LC1D18 18A 220V',5,'UN',   2,  2,'Est.D/Cajón 1', 82000,2),
  ('COT-003','Relé térmico Schneider LRD14 7-10A', 5,'UN',   3,  2,'Est.D/Cajón 2', 42000,2),
  ('COT-004','Relé Omron MY2N 24VDC 2NA',         5,'UN',  10,  5,'Est.D/Cajón 2', 12500,1),
-- Riel DIN (cat 6)
  ('RDN-001','Riel DIN 35mm simétrico 2MT',        6,'UN',  12,  4,'Est.E/Barra 1',  6800,3),
  ('RDN-002','Separador de borneras End Plate',     6,'UN',  80, 20,'Est.E/Cajón 1',   280,3),
  ('RDN-003','Soporte fin de riel TS35',            6,'UN',  60, 20,'Est.E/Cajón 1',   420,3),
  ('RDN-004','Marquilla numérica 0-9 bornera',      6,'UN', 200, 50,'Est.E/Cajón 2',   180,3),
-- Prensaestopas (cat 7)
  ('PRE-001','Prensaestopa PG9 plástico M20',       7,'UN',  80, 20,'Est.F/Cajón 1',   650,1),
  ('PRE-002','Prensaestopa PG13.5 plástico M20',    7,'UN',  60, 20,'Est.F/Cajón 1',   780,1),
  ('PRE-003','Prensaestopa M25 nylon IP68',         7,'UN',  40, 15,'Est.F/Cajón 2',  1100,1),
  ('PRE-004','Tapón ciego M20 nylon',               7,'UN',  50, 10,'Est.F/Cajón 2',   320,1),
-- Canaletas (cat 8)
  ('CAN-001','Canaleta ranurada 25x25mm blanca 2MT',8,'UN',  20,  6,'Est.G/Barra 1',  4500,1),
  ('CAN-002','Canaleta ranurada 40x40mm blanca 2MT',8,'UN',  15,  4,'Est.G/Barra 1',  6200,1),
  ('CAN-003','Canaleta ranurada 60x40mm gris 2MT',  8,'UN',  10,  4,'Est.G/Barra 2',  8900,1),
  ('CAN-004','Perfil Omega 30x15 galvanizado 2MT',  8,'UN',   8,  3,'Est.G/Barra 2',  5400,1),
-- Señalética (cat 9)
  ('SEN-001','Luz piloto LED 22mm verde 220VAC',    9,'UN',  12,  5,'Est.H/Cajón 1',  4800,1),
  ('SEN-002','Luz piloto LED 22mm rojo 220VAC',     9,'UN',  12,  5,'Est.H/Cajón 1',  4800,1),
  ('SEN-003','Luz piloto LED 22mm amarillo 220VAC', 9,'UN',   8,  3,'Est.H/Cajón 1',  4800,1),
  ('SEN-004','Lámpara LED tablero 7W 220VAC',       9,'UN',   5,  2,'Est.H/Cajón 2',  8200,1),
  ('SEN-005','Pulsador rasante 22mm verde NO',      9,'UN',   8,  4,'Est.H/Cajón 2',  5900,1),
  ('SEN-006','Pulsador rasante 22mm rojo NC',       9,'UN',   8,  4,'Est.H/Cajón 2',  5900,1),
  ('SEN-007','Selector 2 posiciones 22mm con llave',9,'UN',   4,  2,'Est.H/Cajón 3',  9800,1);

-- ─── HERRAMIENTAS ──────────────────────────────────────────────
INSERT INTO herramientas (codigo,descripcion,marca,modelo,estado,responsable,ubicacion,fecha_ultima_mant,frecuencia_mant_dias) VALUES
  ('HER-001','Pelacables profesional 0.5-6mm²','KNIPEX',  '11 02 160',  'operativa',    'Juan Pérez',    'Mesa trabajo 1', '2026-03-15', 365),
  ('HER-002','Alicate de corte diagonal 7"',    'KNIPEX',  '74 02 180',  'operativa',    'Juan Pérez',    'Mesa trabajo 1', '2026-03-15', 365),
  ('HER-003','Ponchadora manual ferrules',       'FERRULE', 'HT-225',     'operativa',    'Adrián López',  'Mesa trabajo 2', '2025-11-20', 180),
  ('HER-004','Multímetro digital Fluke 117',     'Fluke',   '117',        'operativa',    'Adrián López',  'Mesa trabajo 2', '2025-12-01', 365),
  ('HER-005','Destornillador plano 5.5mm 1000V', 'WIHA',    '00876',      'operativa',    NULL,            'Mesa trabajo 1', '2026-01-10', 365),
  ('HER-006','Destornillador estrella PH2 1000V','WIHA',    '00912',      'operativa',    NULL,            'Mesa trabajo 1', '2026-01-10', 365),
  ('HER-007','Taladro percutor 13mm 800W',       'Bosch',   'GSB 600',    'en_reparacion','Juan Pérez',   'Servicio técnico','2025-10-05', 180),
  ('HER-008','Amoladora angular 115mm 850W',     'Makita',  'GA4530',     'operativa',    'Carlos Ruiz',   'Zona de corte',  '2026-02-20', 90),
  ('HER-009','Pistola de calor 2000W',           'DEWALT',  'D26960',     'operativa',    NULL,            'Mesa trabajo 3', '2026-04-01', 365),
  ('HER-010','Pinza amperimétrica AC/DC 400A',   'Fluke',   '323',        'extraviada',   'Carlos Ruiz',   'Desconocida',    '2025-09-15', 365),
  ('HER-011','Nivel láser de línea 30m',          'Bosch',   'GLL 30',     'operativa',    NULL,            'Est. herramientas','2026-05-01', 365),
  ('HER-012','Prensa de banco 150mm',            'RECORD',  'No.3',       'operativa',    NULL,            'Banco de trabajo','2026-01-15', 365);

-- ─── PROYECTOS ─────────────────────────────────────────────────
INSERT INTO proyectos (ot,nombre,cliente,estado,fecha_inicio,fecha_entrega) VALUES
  ('OT-2026-001','Tablero de Control Bomba 30HP',      'Agrícola Los Aromos', 'en_proceso',  '2026-05-10','2026-06-20'),
  ('OT-2026-002','Tablero Distribución 3F 200A',       'Inmobiliaria Cóndor', 'terminado',   '2026-04-01','2026-05-30'),
  ('OT-2026-003','Tablero de Fuerza Motor 15kW',       'Industrias PROA',     'presupuesto', '2026-06-15','2026-07-30'),
  ('OT-2026-004','Panel Variador de Frecuencia 11kW',  'Minera Ciprés',       'en_proceso',  '2026-05-20','2026-06-30'),
  ('OT-2025-018','Tablero de Mando CNC Fresadora',     'Metalmecánica Andes', 'entregado',   '2025-11-01','2025-12-15');

-- ─── MOVIMIENTOS DE EJEMPLO ────────────────────────────────────
-- Movimientos coherentes con el stock actual cargado
INSERT INTO movimientos (material_id,tipo,cantidad,stock_antes,stock_despues,proyecto_id,usuario,motivo,precio_unit,fecha) VALUES
  (1,'entrada',100,150,250,NULL,'admin','Compra OC-1023 Electro Sur',520,'2026-05-02 09:15:00'),
  (9,'entrada',200,150,350,NULL,'admin','Compra OC-0891 Aesimac',890,'2026-05-05 10:30:00'),
  (16,'entrada',10,0,10,NULL,'admin','Compra OC-0455 Schneider',18500,'2026-05-06 11:00:00'),
  (1,'salida',25,250,225,1,'Juan Pérez','Consumo OT-2026-001',520,'2026-05-12 14:00:00'),
  (2,'salida',15,180,165,1,'Juan Pérez','Consumo OT-2026-001',780,'2026-05-12 14:05:00'),
  (9,'salida',40,350,310,1,'Juan Pérez','Borneras OT-2026-001',890,'2026-05-13 09:00:00'),
  (17,'salida',4,12,8,1,'Adrián López','Automáticos OT-2026-001',18500,'2026-05-13 09:15:00'),
  (28,'salida',2,12,10,1,'Juan Pérez','Rieles DIN OT-2026-001',6800,'2026-05-13 10:00:00'),
  (24,'salida',1,4,3,4,'Adrián López','Contactor variador OT-2026-004',65000,'2026-05-22 11:00:00'),
  (4,'salida',20,90,70,4,'Adrián López','Cable tierra OT-2026-004',1650,'2026-05-22 11:10:00'),
  (7,'ajuste',8,10,8,NULL,'admin','Ajuste físico: 2MT dañados',NULL,'2026-06-01 08:00:00'),
  (16,'devolucion',2,8,10,NULL,'Carlos Ruiz','Devolución presupuesto cancelado',NULL,'2026-06-05 16:00:00');
