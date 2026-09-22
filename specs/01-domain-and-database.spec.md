# Especificación Técnica: Modelo de Datos y Base de Datos Relacional

**Identificador:** `SPEC-DATA-001`  
**Archivo de Destino:** `specs/01-domain-and-database.spec.md`  
**Módulos Relacionados:** `PostgreSQL DDL`, `src/types.ts`  
**Requerimientos SRS:** `RF-01`, `RF-02`, `RF-04`, `RF-05`, `RNF-01`  
**Estado:** `Aprobado`  

---

## 1. Propósito y Alcance

Esta especificación formaliza el esquema relacional en PostgreSQL 15+ necesario para soportar el pipeline de conciliación en dos fases:
1. **Fase 1 (Resolución de Identidad):** Indexación léxica mediante la extensión nativa `pg_trgm` sobre nombres de productos y persistencia estricta de resoluciones (`product_mappings`) garantizando idempotencia mediante índices únicos parciales.
2. **Fase 2 (Cruce Determinista de Stock):** Operación relacional de baja latencia ($\le 200\text{ ms}$) apoyada en índices B-Tree sobre SKUs normalizados y claves foráneas con eliminación en cascada.

---

## 2. Contratos y Definición de Esquema (DDL)

```sql
-- 1. Habilitar extensión para similitud léxica y trigramas
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Enumerador tipado para estados de resolución
DO $$ BEGIN
    CREATE TYPE mapping_status AS ENUM ('CONFIRMED', 'REQUIRES_REVIEW', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Catálogo de productos de la empresa cliente
CREATE TABLE IF NOT EXISTS client_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) NOT NULL UNIQUE,
    normalized_sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices de búsqueda para client_products
CREATE INDEX IF NOT EXISTS idx_client_normalized_sku ON client_products(normalized_sku);
CREATE INDEX IF NOT EXISTS idx_client_name_trgm ON client_products USING gin (name gin_trgm_ops);

-- 4. Catálogo de productos de proveedores con control de existencias
CREATE TABLE IF NOT EXISTS supplier_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) NOT NULL UNIQUE,
    normalized_sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices de búsqueda para supplier_products
CREATE INDEX IF NOT EXISTS idx_supplier_normalized_sku ON supplier_products(normalized_sku);
CREATE INDEX IF NOT EXISTS idx_supplier_name_trgm ON supplier_products USING gin (name gin_trgm_ops);

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
-- Asegura que no se dupliquen emparejamientos confirmados o en revisión entre cliente y proveedor
CREATE UNIQUE INDEX IF NOT EXISTS uq_client_supplier_pair 
    ON product_mappings(client_sku, supplier_sku) 
    WHERE supplier_sku IS NOT NULL;

-- Asegura que un producto cliente descartado/huérfano solo tenga un registro REJECTED activo
CREATE UNIQUE INDEX IF NOT EXISTS uq_client_rejected_orphan 
    ON product_mappings(client_sku) 
    WHERE supplier_sku IS NULL;

-- Índice para acelerar filtros de exclusión en Fase 1 y cruce en Fase 2
CREATE INDEX IF NOT EXISTS idx_mapping_client_status ON product_mappings(client_sku, status);
```

---

## 3. Invariantes del Modelo y Reglas de Integridad

1. **Invariante de Idempotencia Huérfana:**
   - Si un producto del cliente no produce candidatos o todos son rechazados, se inserta con `supplier_sku = NULL` y `status = 'REJECTED'`.
   - El índice `uq_client_rejected_orphan` garantiza que ninguna ejecución concurrente pueda insertar duplicados de un ítem descartado.
2. **Invariante de Integridad Referencial:**
   - La eliminación de un producto cliente (`client_products`) o proveedor (`supplier_products`) propaga automáticamente la eliminación en `product_mappings` (`ON DELETE CASCADE`), impidiendo registros huérfanos con claves inválidas.
3. **Invariante de Búsqueda Acelerada (Blocking Léxico):**
   - Las consultas de candidatos sobre `supplier_products.name` deben hacer uso obligatorio del operador `%` soportado por el índice GIN `idx_supplier_name_trgm` con operador de clase `gin_trgm_ops`.
4. **Invariante de Tipado de Estados:**
   - Solo los valores `CONFIRMED`, `REQUIRES_REVIEW` y `REJECTED` son válidos para la columna `status`.

---

## 4. Criterios de Aceptación (BDD / Given-When-Then)

### Escenario 1: Creación de índices GIN para búsqueda por trigramas
- **Given** una base de datos PostgreSQL 15+ con la extensión `pg_trgm` habilitada.
- **When** se ejecutan las sentencias DDL de creación de tablas e índices.
- **Then** el índice `idx_supplier_name_trgm` existe sobre la columna `name` utilizando el método de acceso `gin` y el operador de clase `gin_trgm_ops`.

### Escenario 2: Restricción de unicidad para pares Cliente-Proveedor
- **Given** un registro existente en `product_mappings` con `client_sku = 'CLI-001'`, `supplier_sku = 'SUP-999'` y `status = 'CONFIRMED'`.
- **When** se intenta insertar un segundo registro con los mismos `client_sku` y `supplier_sku`.
- **Then** la base de datos lanza un error de violación de clave única (`uq_client_supplier_pair`).

### Escenario 3: Restricción de unicidad para registros huérfanos / descartados
- **Given** un producto de cliente `client_sku = 'CLI-002'` insertado en `product_mappings` con `supplier_sku = NULL` y `status = 'REJECTED'`.
- **When** el worker por error o reintento intenta insertar otro registro huérfano para `client_sku = 'CLI-002'` con `supplier_sku = NULL`.
- **Then** la base de datos rechaza la inserción por violación del índice único parcial `uq_client_rejected_orphan`.

### Escenario 4: Transición de Huérfano a Mapeo Válido
- **Given** un producto cliente con registro huérfano previo (`supplier_sku IS NULL`).
- **When** un nuevo catálogo del proveedor incorpora el ítem y se genera un mapeo válido con `supplier_sku = 'SUP-100'`.
- **Then** la inserción de (`'CLI-002'`, `'SUP-100'`) es aceptada por la base de datos porque el índice `uq_client_supplier_pair` evalúa únicamente filas con `supplier_sku IS NOT NULL`.

---

## 5. Mapeo a Contratos de Dominio (`src/types.ts`)

Las entidades relacionales se mapean 1:1 con las interfaces TypeScript del dominio:

```typescript
// Extraído de src/types.ts (SSOT)
export type MappingStatus = "CONFIRMED" | "REQUIRES_REVIEW" | "REJECTED";

export interface ClientProduct {
  id: string;
  sku: string;
  normalizedSku: string;
  name: string;
}

export interface SupplierCandidate {
  sku: string;
  normalizedSku: string;
  name: string;
  similarityScore: number;
}

export interface MappingRecord {
  clientSku: string;
  supplierSku: string | null;
  confidenceScore: number;
  status: MappingStatus;
  discrepancyReason: string;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
}
```
