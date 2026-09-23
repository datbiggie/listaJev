-- ==============================================================================
-- Esquema DDL Relacional - PostgreSQL 15+
-- Sistema de Conciliación de Catálogos y Sincronización de Stock
-- ==============================================================================

-- 1. Extensión para similitud léxica basada en trigramas
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Enumerador tipado para estados de resolución
DO $$ BEGIN
    CREATE TYPE mapping_status AS ENUM ('CONFIRMED', 'REQUIRES_REVIEW', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Catálogo de productos del cliente
CREATE TABLE IF NOT EXISTS client_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) NOT NULL UNIQUE,
    normalized_sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_normalized_sku ON client_products(normalized_sku);
CREATE INDEX IF NOT EXISTS idx_client_name_trgm ON client_products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_client_brand ON client_products(brand);

-- 4. Catálogo de productos de proveedores con existencias
CREATE TABLE IF NOT EXISTS supplier_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) NOT NULL UNIQUE,
    normalized_sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    current_stock INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supplier_normalized_sku ON supplier_products(normalized_sku);
CREATE INDEX IF NOT EXISTS idx_supplier_name_trgm ON supplier_products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_supplier_brand ON supplier_products(brand);

-- 5. Tabla de mapeos, resoluciones semánticas y auditoría
CREATE TABLE IF NOT EXISTS product_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_sku VARCHAR(100) NOT NULL REFERENCES client_products(sku) ON DELETE CASCADE,
    supplier_sku VARCHAR(100) REFERENCES supplier_products(sku) ON DELETE CASCADE,
    confidence_score NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
    status mapping_status NOT NULL,
    discrepancy_reason VARCHAR(255) NOT NULL,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Índices únicos parciales (Garantía de Idempotencia y Prevención de Bucles)
CREATE UNIQUE INDEX IF NOT EXISTS uq_client_supplier_pair 
    ON product_mappings(client_sku, supplier_sku) 
    WHERE supplier_sku IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_client_rejected_orphan 
    ON product_mappings(client_sku) 
    WHERE supplier_sku IS NULL;

CREATE INDEX IF NOT EXISTS idx_mapping_client_status ON product_mappings(client_sku, status);
