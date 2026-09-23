-- Migración 002: Incorporación de columna 'brand' en client_products y supplier_products
-- Soporte para comparaciones de marcas en conciliación automática y revisión manual

-- 1. Agregar columna brand a client_products
ALTER TABLE client_products ADD COLUMN IF NOT EXISTS brand VARCHAR(100);

-- 2. Agregar columna brand a supplier_products
ALTER TABLE supplier_products ADD COLUMN IF NOT EXISTS brand VARCHAR(100);

-- 3. Índices para acelerar búsquedas y agrupaciones por marca
CREATE INDEX IF NOT EXISTS idx_client_brand ON client_products(brand);
CREATE INDEX IF NOT EXISTS idx_supplier_brand ON supplier_products(brand);

-- 4. Backfill retroactivo para registros existentes a partir de las marcas más comunes
UPDATE client_products
SET brand = CASE
    WHEN name ~* '\y(ENELBROCK|ENELB)\M' THEN 'ENELBROCK'
    WHEN name ~* '\y(KOREA-PORTER|PORTER)\M' THEN 'PORTER'
    WHEN name ~* '\yOTT\M' THEN 'OTT'
    WHEN name ~* '\yKOYO\M' THEN 'KOYO'
    WHEN name ~* '\yTW\M' THEN 'TW'
    WHEN name ~* '\yNTN\M' THEN 'NTN'
    WHEN name ~* '\yNACIONAL\M' THEN 'NACIONAL'
    WHEN name ~* '\yPRECISION\M' THEN 'PRECISION'
    WHEN name ~* '\yTIMKEN\M' THEN 'TIMKEN'
    WHEN name ~* '\yWALKER\M' THEN 'WALKER'
    WHEN name ~* '\yNOVSIGHT\M' THEN 'NOVSIGHT'
    WHEN name ~* '\yVULKO\M' THEN 'VULKO'
    WHEN name ~* '\yIVICA\M' THEN 'IVICA'
    WHEN name ~* '\yTITAN\M' THEN 'TITAN'
    WHEN name ~* '\yREGITAR\M' THEN 'REGITAR'
    WHEN name ~* '\yVENEFARO\M' THEN 'VENEFARO'
    WHEN name ~* '\yEAGLEYE\M' THEN 'EAGLEYE'
    WHEN name ~* '\yOSSROM\M' THEN 'OSSROM'
    WHEN name ~* '\yRALLY\M' THEN 'RALLY'
    WHEN name ~* '\yWAGNER\M' THEN 'WAGNER'
    WHEN name ~* '\yUSA\M' THEN 'USA'
    ELSE NULL
END
WHERE brand IS NULL;

UPDATE supplier_products
SET brand = CASE
    WHEN name ~* '\y(ENELBROCK|ENELB)\M' THEN 'ENELBROCK'
    WHEN name ~* '\y(KOREA-PORTER|PORTER)\M' THEN 'PORTER'
    WHEN name ~* '\yOTT\M' THEN 'OTT'
    WHEN name ~* '\yKOYO\M' THEN 'KOYO'
    WHEN name ~* '\yTW\M' THEN 'TW'
    WHEN name ~* '\yNTN\M' THEN 'NTN'
    WHEN name ~* '\yNACIONAL\M' THEN 'NACIONAL'
    WHEN name ~* '\yPRECISION\M' THEN 'PRECISION'
    WHEN name ~* '\yTIMKEN\M' THEN 'TIMKEN'
    WHEN name ~* '\yWALKER\M' THEN 'WALKER'
    WHEN name ~* '\yNOVSIGHT\M' THEN 'NOVSIGHT'
    WHEN name ~* '\yVULKO\M' THEN 'VULKO'
    WHEN name ~* '\yIVICA\M' THEN 'IVICA'
    WHEN name ~* '\yTITAN\M' THEN 'TITAN'
    WHEN name ~* '\yREGITAR\M' THEN 'REGITAR'
    WHEN name ~* '\yVENEFARO\M' THEN 'VENEFARO'
    WHEN name ~* '\yEAGLEYE\M' THEN 'EAGLEYE'
    WHEN name ~* '\yOSSROM\M' THEN 'OSSROM'
    WHEN name ~* '\yRALLY\M' THEN 'RALLY'
    WHEN name ~* '\yWAGNER\M' THEN 'WAGNER'
    WHEN name ~* '\yUSA\M' THEN 'USA'
    ELSE NULL
END
WHERE brand IS NULL;
