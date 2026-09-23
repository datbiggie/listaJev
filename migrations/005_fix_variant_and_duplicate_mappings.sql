-- Migración 005: Desvinculación de variantes incompatibles y falsos positivos de sufijos
-- Corrige el mapeo erróneo de FP-50100-KIT hacia FP-50100 del proveedor (kit de reparación vs bomba individual),
-- así como otros falsos positivos de variantes (flotadores vs bombas, tapas vs módulos, bombillos 24V vs 12V, tuercas de distinto paso).

-- 1. Eliminar mapeos erróneos de productos con discrepancia de variantes
DELETE FROM product_mappings
WHERE client_sku IN (
  'FP-50100-KIT',
  'FPM-GETZFLOAT',
  'FPM-GETZCAP',
  'FPM-ARAUCA-FLO',
  'FPM-COROLLAFLOAFLOTADOR',
  'FPM-DMAXFLOAT',
  'FPM-ELANTRA-CAP',
  'P43-100W-24V',
  'TRC-1/2',
  '15330',
  'STB-T10F'
);

-- 2. Registrar los productos del cliente sin equivalente como REJECTED (huérfanos/no catalogados)
INSERT INTO product_mappings (
  client_sku,
  supplier_sku,
  confidence_score,
  status,
  discrepancy_reason
) VALUES
  ('FP-50100-KIT', NULL, 0.00, 'REJECTED', 'NO_CANDIDATES_FOUND'),
  ('FPM-GETZFLOAT', NULL, 0.00, 'REJECTED', 'NO_CANDIDATES_FOUND'),
  ('FPM-GETZCAP', NULL, 0.00, 'REJECTED', 'NO_CANDIDATES_FOUND'),
  ('FPM-ARAUCA-FLO', NULL, 0.00, 'REJECTED', 'NO_CANDIDATES_FOUND'),
  ('FPM-COROLLAFLOAFLOTADOR', NULL, 0.00, 'REJECTED', 'NO_CANDIDATES_FOUND'),
  ('FPM-DMAXFLOAT', NULL, 0.00, 'REJECTED', 'NO_CANDIDATES_FOUND'),
  ('FPM-ELANTRA-CAP', NULL, 0.00, 'REJECTED', 'NO_CANDIDATES_FOUND'),
  ('P43-100W-24V', NULL, 0.00, 'REJECTED', 'NO_CANDIDATES_FOUND'),
  ('TRC-1/2', NULL, 0.00, 'REJECTED', 'NO_CANDIDATES_FOUND'),
  ('15330', NULL, 0.00, 'REJECTED', 'NO_CANDIDATES_FOUND'),
  ('STB-T10F', NULL, 0.00, 'REJECTED', 'NO_CANDIDATES_FOUND')
ON CONFLICT (client_sku) WHERE supplier_sku IS NULL DO UPDATE SET
  confidence_score = EXCLUDED.confidence_score,
  status = EXCLUDED.status,
  discrepancy_reason = EXCLUDED.discrepancy_reason,
  updated_at = CURRENT_TIMESTAMP;

-- 3. Asegurar que los productos legítimos exactos y unívocos se mantengan como CONFIRMED
INSERT INTO product_mappings (
  client_sku,
  supplier_sku,
  confidence_score,
  status,
  discrepancy_reason
) VALUES
  ('FP-50100', 'FP-50100', 1.00, 'CONFIRMED', 'NONE'),
  ('FPM-GETZ', 'FPM-GETZ', 1.00, 'CONFIRMED', 'NONE'),
  ('FPM-ARAUCA', 'FPM-ARAUCA', 1.00, 'CONFIRMED', 'NONE'),
  ('FPM-COROLLA', 'FPM-COROLLA', 1.00, 'CONFIRMED', 'NONE'),
  ('FPM-DMAX', 'FPM-DMAX', 1.00, 'CONFIRMED', 'NONE'),
  ('P43-100W', 'P43-100W', 1.00, 'CONFIRMED', 'NONE'),
  ('TRC-12X1.5', 'TRC-12X1.5', 1.00, 'CONFIRMED', 'NONE'),
  ('15330-22030', '15330-22030', 1.00, 'CONFIRMED', 'NONE'),
  ('STB-T10', 'STB-T10', 1.00, 'CONFIRMED', 'NONE')
ON CONFLICT (client_sku, supplier_sku) WHERE supplier_sku IS NOT NULL DO UPDATE SET
  confidence_score = EXCLUDED.confidence_score,
  status = EXCLUDED.status,
  discrepancy_reason = EXCLUDED.discrepancy_reason,
  updated_at = CURRENT_TIMESTAMP;
