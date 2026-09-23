-- Migración 004: Corrección y soporte de productos con SKUs que poseen espacio
-- Corrige SKUs truncados erróneamente al primer espacio (ej. '25' -> '25 MIN')
-- y recupera productos que fueron sobreescritos por colisión de claves numéricas.

-- 1. Eliminar mapeos antiguos o erróneos para evitar violaciones de clave foránea y desvincular falsos positivos
DELETE FROM product_mappings 
WHERE client_sku IN ('10', '15', '20', '25', '30', '35', '40', '50', '60', '25162753', '25184786')
   OR supplier_sku IN ('10', '15', '20', '25', '30', '35', '40', '50', '60', '80');

-- 2. Actualizar client_products con sus SKUs completos y nombres saneados
UPDATE client_products
SET sku = '10 MIN', normalized_sku = '10MIN', name = 'FUSIBLE MODERNO MINI 10 AMP (100 PZAS)'
WHERE sku = '10' AND name ILIKE '%MIN FUSIBLE%';

UPDATE client_products
SET sku = '15 MIN', normalized_sku = '15MIN', name = 'FUSIBLE MODERNO MINI 15 AMP (100 PZAS)'
WHERE sku = '15' AND name ILIKE '%MIN FUSIBLE%';

UPDATE client_products
SET sku = '25 MIN', normalized_sku = '25MIN', name = 'FUSIBLE MODERNO MINI 25 AMP (100 PZAS)'
WHERE sku = '25' AND name ILIKE '%MIN FUSIBLE%';

UPDATE client_products
SET sku = '35 MIN', normalized_sku = '35MIN', name = 'FUSIBLE MODERNO MINI 35 AMP (100 PZAS)'
WHERE sku = '35' AND name ILIKE '%MIN FUSIBLE%';

UPDATE client_products
SET sku = '20 HEM', normalized_sku = '20HEM', name = 'FUSIBLE TIPO HEMBRA 20 AMP'
WHERE sku = '20' AND name ILIKE '%HEM FUSIBLE%';

UPDATE client_products
SET sku = '30 HEM', normalized_sku = '30HEM', name = 'FUSIBLE TIPO HEMBRA 30 AMP'
WHERE sku = '30' AND name ILIKE '%HEM FUSIBLE%';

UPDATE client_products
SET sku = '40 HEM', normalized_sku = '40HEM', name = 'FUSIBLE TOYOTA HEMBRA 40 AMP'
WHERE sku = '40' AND name ILIKE '%HEM FUSIBLE%';

UPDATE client_products
SET sku = '50 HEM', normalized_sku = '50HEM', name = 'FUSIBLE TIPO HEMBRA 50 AMP'
WHERE sku = '50' AND name ILIKE '%HEM FUSIBLE%';

UPDATE client_products
SET sku = '60 HEM', normalized_sku = '60HEM', name = 'FUSIBLE TIPO HEMBRA 60 AMP'
WHERE sku = '60' AND name ILIKE '%HEM FUSIBLE%';

-- 3. Actualizar supplier_products existentes
UPDATE supplier_products
SET sku = '10 MIN', normalized_sku = '10MIN', name = 'FUSIBLE MODERNO MINI 10 AMP (100 PZAS)'
WHERE sku = '10' AND name ILIKE '%MIN FUSIBLE%';

UPDATE supplier_products
SET sku = '25 MIN', normalized_sku = '25MIN', name = 'FUSIBLE MODERNO MINI 25 AMP (100 PZAS)'
WHERE sku = '25' AND name ILIKE '%MIN FUSIBLE%';

UPDATE supplier_products
SET sku = '35 MIN', normalized_sku = '35MIN', name = 'FUSIBLE MODERNO MINI 35 AMP (100 PZAS)'
WHERE sku = '35' AND name ILIKE '%MIN FUSIBLE%';

UPDATE supplier_products
SET sku = '20 HEM', normalized_sku = '20HEM', name = 'FUSIBLE TIPO HEMBRA 20 AMP'
WHERE sku = '20' AND name ILIKE '%HEM FUSIBLE%';

UPDATE supplier_products
SET sku = '80 HEM', normalized_sku = '80HEM', name = 'FUSIBLE TOYOTA HEMBRA 80 AMP'
WHERE sku = '80' AND name ILIKE '%HEM FUSIBLE%';

UPDATE supplier_products
SET sku = '30 MACHO', normalized_sku = '30MACHO', name = 'FUSIBLE TOYOTA MACHO 30 AMP'
WHERE sku = '30' AND name ILIKE '%MACHO FUSIBLE%';

UPDATE supplier_products
SET sku = '40 MACHO', normalized_sku = '40MACHO', name = 'FUSIBLE TOYOTA MACHO 40 AMP'
WHERE sku = '40' AND name ILIKE '%MACHO FUSIBLE%';

UPDATE supplier_products
SET sku = '50 MACHO', normalized_sku = '50MACHO', name = 'FUSIBLE TOYOTA MACHO 50 AMP'
WHERE sku = '50' AND name ILIKE '%MACHO FUSIBLE%';

UPDATE supplier_products
SET sku = '60 MACHO', normalized_sku = '60MACHO', name = 'FUSIBLE TOYOTA MACHO 60 AMP'
WHERE sku = '60' AND name ILIKE '%MACHO FUSIBLE%';

-- 4. Reincorporar productos de proveedor que fueron sobreescritos por colisión de clave '20', '30', '50', '60'
INSERT INTO supplier_products (sku, normalized_sku, name, brand, current_stock, updated_at)
VALUES 
  ('20 MIN', '20MIN', 'FUSIBLE MODERNO MINI 20 AMP (100 PZAS)', 'ENELBROCK', 657, CURRENT_TIMESTAMP),
  ('30 MIN', '30MIN', 'FUSIBLE MODERNO MINI 30 AMP (100 PZAS)', 'ENELBROCK', 736, CURRENT_TIMESTAMP),
  ('30 HEM', '30HEM', 'FUSIBLE TIPO HEMBRA 30 AMP', 'ENELBROCK', 2920, CURRENT_TIMESTAMP),
  ('50 HEM', '50HEM', 'FUSIBLE TIPO HEMBRA 50 AMP', 'ENELBROCK', 821, CURRENT_TIMESTAMP),
  ('60 HEM', '60HEM', 'FUSIBLE TIPO HEMBRA 60 AMP', 'ENELBROCK', 2340, CURRENT_TIMESTAMP)
ON CONFLICT (sku) DO UPDATE SET
  normalized_sku = EXCLUDED.normalized_sku,
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  current_stock = EXCLUDED.current_stock,
  updated_at = CURRENT_TIMESTAMP;

-- 5. Reinsertar mapeos limpios y correctos para los productos corregidos
INSERT INTO product_mappings (client_sku, supplier_sku, confidence_score, status, discrepancy_reason)
VALUES 
  ('10 MIN', '10 MIN', 1.00, 'CONFIRMED', 'NONE'),
  ('15 MIN', '15MIN-ENELB', 1.00, 'CONFIRMED', 'NONE'),
  ('25 MIN', '25 MIN', 1.00, 'CONFIRMED', 'NONE'),
  ('35 MIN', '35 MIN', 1.00, 'CONFIRMED', 'NONE'),
  ('20 HEM', '20 HEM', 1.00, 'CONFIRMED', 'NONE'),
  ('30 HEM', '30 HEM', 1.00, 'CONFIRMED', 'NONE'),
  ('50 HEM', '50 HEM', 1.00, 'CONFIRMED', 'NONE'),
  ('60 HEM', '60 HEM', 1.00, 'CONFIRMED', 'NONE'),
  ('25184786', '25184786-ENELB', 1.00, 'CONFIRMED', 'NONE')
ON CONFLICT DO NOTHING;
