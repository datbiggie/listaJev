-- Migración 003: Corrección de datos para el producto SE9015416
-- Se corrige la anomalía donde el SKU fue extraído junto con la descripción y se actualiza el stock real a 36 unidades.

DO $$
BEGIN
    -- 1. Eliminar cualquier mapeo previo que involucre el SKU erróneo o el corregido
    DELETE FROM product_mappings 
    WHERE client_sku IN ('SE9015416 SENSOR MAP GM AVEO 1.6 LS CHERY QQ OEM', 'SE9015416')
       OR supplier_sku IN ('SE9015416 SENSOR MAP GM AVEO 1.6 LS CHERY QQ OEM', 'SE9015416');

    -- 2. Corregir producto del cliente
    UPDATE client_products
    SET sku = 'SE9015416',
        normalized_sku = 'SE9015416',
        name = 'SENSOR MAP GM AVEO 1.6 LS CHERY QQ OEM',
        brand = 'PORTER'
    WHERE sku = 'SE9015416 SENSOR MAP GM AVEO 1.6 LS CHERY QQ OEM';

    -- 3. Corregir producto del proveedor (stock real = 36)
    UPDATE supplier_products
    SET sku = 'SE9015416',
        normalized_sku = 'SE9015416',
        name = 'SENSOR MAP GM AVEO 1.6 LS CHERY QQ OEM',
        brand = 'PORTER',
        current_stock = 36
    WHERE sku = 'SE9015416 SENSOR MAP GM AVEO 1.6 LS CHERY QQ OEM';

    -- 4. Insertar el mapeo confirmado con la relación corregida
    INSERT INTO product_mappings (
        id,
        client_sku,
        supplier_sku,
        confidence_score,
        status,
        discrepancy_reason,
        created_at,
        updated_at
    ) VALUES (
        '2688f828-90bd-4bed-834a-fd3e2f3ba1c2',
        'SE9015416',
        'SE9015416',
        1.00,
        'CONFIRMED',
        'NONE',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

END $$;
