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

-- 2. Registrar los productos del cliente sin equivalente como REJECTED (huérfanos/no catalogados) sólo si existen en client_products
INSERT INTO product_mappings (
  client_sku,
  supplier_sku,
  confidence_score,
  status,
  discrepancy_reason
)
SELECT v.client_sku, NULL, 0.00, 'REJECTED'::mapping_status, 'NO_CANDIDATES_FOUND'
FROM (VALUES
  ('FP-50100-KIT'),
  ('FPM-GETZFLOAT'),
  ('FPM-GETZCAP'),
  ('FPM-ARAUCA-FLO'),
  ('FPM-COROLLAFLOAFLOTADOR'),
  ('FPM-DMAXFLOAT'),
  ('FPM-ELANTRA-CAP'),
  ('P43-100W-24V'),
  ('TRC-1/2'),
  ('15330'),
  ('STB-T10F')
) AS v(client_sku)
JOIN client_products cp ON cp.sku = v.client_sku
ON CONFLICT (client_sku) WHERE supplier_sku IS NULL DO UPDATE SET
  confidence_score = EXCLUDED.confidence_score,
  status = EXCLUDED.status,
  discrepancy_reason = EXCLUDED.discrepancy_reason,
  updated_at = CURRENT_TIMESTAMP;

-- 3. Asegurar que los productos legítimos exactos y unívocos se mantengan como CONFIRMED sólo si existen
INSERT INTO product_mappings (
  client_sku,
  supplier_sku,
  confidence_score,
  status,
  discrepancy_reason
)
SELECT v.client_sku, v.supplier_sku, 1.00, 'CONFIRMED'::mapping_status, 'NONE'
FROM (VALUES
  ('FP-50100', 'FP-50100'),
  ('FPM-GETZ', 'FPM-GETZ'),
  ('FPM-ARAUCA', 'FPM-ARAUCA'),
  ('FPM-COROLLA', 'FPM-COROLLA'),
  ('FPM-DMAX', 'FPM-DMAX'),
  ('P43-100W', 'P43-100W'),
  ('TRC-12X1.5', 'TRC-12X1.5'),
  ('15330-22030', '15330-22030'),
  ('STB-T10', 'STB-T10')
) AS v(client_sku, supplier_sku)
JOIN client_products cp ON cp.sku = v.client_sku
JOIN supplier_products sp ON sp.sku = v.supplier_sku
ON CONFLICT (client_sku, supplier_sku) WHERE supplier_sku IS NOT NULL DO UPDATE SET
  confidence_score = EXCLUDED.confidence_score,
  status = EXCLUDED.status,
  discrepancy_reason = EXCLUDED.discrepancy_reason,
  updated_at = CURRENT_TIMESTAMP;
