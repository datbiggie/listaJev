# Especificación Técnica: Capa de Repositorio de Productos y Base de Datos

**Identificador:** `SPEC-REPO-004`  
**Archivo de Destino:** `specs/04-product-repository.spec.md`  
**Módulos Relacionados:** `src/product.repository.ts`, `src/types.ts`  
**Requerimientos SRS:** `RF-01`, `RF-02`, `RF-04`, `RF-05`, `RF-07`  
**Estado:** `Aprobado`  

---

## 1. Propósito y Alcance

Esta especificación detalla el contrato y la implementación de la capa de acceso a datos para productos y mapeos en PostgreSQL.

Responsabilidades clave:
1. **Extracción Idempotente:** Obtención de productos del cliente no conciliados mediante `WHERE NOT EXISTS` en `product_mappings`.
2. **Búsqueda Léxica Aislada (Blocking):** Ejecución de consultas trigrama con el operador `%` asegurando el aislamiento del umbral de similitud en la sesión mediante `set_config('pg_trgm.similarity_threshold', ..., true)` en un bloque transaccional (`BEGIN / COMMIT / ROLLBACK`), protegiendo el pool de conexiones de contaminación cruzada.
3. **Persistencia Bifurcada e Idempotente:** Inserción y actualización (`ON CONFLICT`) distinguiendo emparejamientos con proveedor de registros huérfanos o descartados (`supplier_sku IS NULL`).
4. **Soporte para Auditoría Manual:** Consulta y resolución de registros en estado `REQUIRES_REVIEW`.

---

## 2. Definición del Contrato (`IProductRepository`)

Todas las interfaces y tipos son importados exclusivamente de `src/types.ts`:

```typescript
import { Pool } from "pg";
import {
  ClientProduct,
  MappingRecord,
  MappingStatus,
  SupplierCandidate
} from "./types";

export interface IProductRepository {
  /**
   * Obtiene productos del cliente que no poseen ningún registro en product_mappings.
   *
   * @param limit - Tamaño máximo del lote a recuperar.
   */
  getUnmappedClientProducts(limit: number): Promise<ClientProduct[]>;

  /**
   * Busca hasta N candidatos en supplier_products que superen el umbral de similitud léxica.
   * Ejecuta la consulta de forma transaccional con SET LOCAL para evitar polución del pool.
   *
   * @param clientProductName - Nombre del producto cliente a comparar.
   * @param similarityThreshold - Umbral de similitud [0.0, 1.0].
   * @param limit - Máximo de candidatos a retornar (típicamente 3).
   */
  findSupplierCandidates(
    clientProductName: string,
    similarityThreshold: number,
    limit: number
  ): Promise<SupplierCandidate[]>;

  /**
   * Persiste o actualiza un registro en product_mappings (manejando tanto candidatos válidos como huérfanos).
   *
   * @param record - Registro de mapeo con estado, confianza y causal.
   */
  saveMapping(record: MappingRecord): Promise<void>;

  /**
   * Obtiene la cola de mapeos en estado REQUIRES_REVIEW pendientes de auditoría humana.
   *
   * @param limit - Cantidad máxima de registros a auditar.
   */
  getPendingReviews(limit: number): Promise<MappingRecord[]>;

  /**
   * Actualiza el estado de un mapeo tras la revisión de un operador humano.
   *
   * @param clientSku - SKU del producto cliente evaluado.
   * @param status - Nuevo estado ("CONFIRMED" | "REJECTED").
   * @param reviewer - Identificador o usuario del operador que audita.
   */
  resolveAuditReview(
    clientSku: string,
    status: "CONFIRMED" | "REJECTED",
    reviewer: string
  ): Promise<void>;
}
```

---

## 3. Implementación de Referencia (`PostgresProductRepository`)

```typescript
export class PostgresProductRepository implements IProductRepository {
  constructor(private readonly pool: Pool) {}

  public async getUnmappedClientProducts(limit: number): Promise<ClientProduct[]> {
    const query = `
      SELECT 
        c.id, 
        c.sku, 
        c.normalized_sku AS "normalizedSku", 
        c.name
      FROM client_products c
      WHERE NOT EXISTS (
        SELECT 1 FROM product_mappings m 
        WHERE m.client_sku = c.sku
      )
      LIMIT $1;
    `;
    const result = await this.pool.query<ClientProduct>(query, [limit]);
    return result.rows;
  }

  public async findSupplierCandidates(
    clientProductName: string,
    similarityThreshold: number,
    limit: number
  ): Promise<SupplierCandidate[]> {
    const client = await this.pool.connect();
    try {
      // Inicia transacción para encapsular el umbral de similitud
      await client.query("BEGIN;");
      
      // set_config con is_local = true equivale a SET LOCAL pg_trgm.similarity_threshold
      await client.query(
        "SELECT set_config('pg_trgm.similarity_threshold', $1::text, true);",
        [similarityThreshold.toString()]
      );

      const query = `
        SELECT 
          s.sku,
          s.normalized_sku AS "normalizedSku",
          s.name,
          similarity(s.name, $1) AS "similarityScore"
        FROM supplier_products s
        WHERE s.name % $1
        ORDER BY "similarityScore" DESC
        LIMIT $2;
      `;
      const result = await client.query<SupplierCandidate>(query, [
        clientProductName,
        limit
      ]);
      await client.query("COMMIT;");
      return result.rows;
    } catch (error) {
      await client.query("ROLLBACK;");
      throw error;
    } finally {
      // Garantiza liberación de la conexión al pool
      client.release();
    }
  }

  public async saveMapping(record: MappingRecord): Promise<void> {
    const queryPair = `
      INSERT INTO product_mappings (
        client_sku, 
        supplier_sku, 
        confidence_score, 
        status, 
        discrepancy_reason,
        reviewed_by,
        reviewed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (client_sku, supplier_sku) WHERE supplier_sku IS NOT NULL
      DO UPDATE SET
        confidence_score = EXCLUDED.confidence_score,
        status = EXCLUDED.status,
        discrepancy_reason = EXCLUDED.discrepancy_reason,
        updated_at = CURRENT_TIMESTAMP;
    `;

    const queryOrphan = `
      INSERT INTO product_mappings (
        client_sku, 
        supplier_sku, 
        confidence_score, 
        status, 
        discrepancy_reason
      ) VALUES ($1, NULL, $2, $3, $4)
      ON CONFLICT (client_sku) WHERE supplier_sku IS NULL
      DO UPDATE SET
        confidence_score = EXCLUDED.confidence_score,
        status = EXCLUDED.status,
        discrepancy_reason = EXCLUDED.discrepancy_reason,
        updated_at = CURRENT_TIMESTAMP;
    `;

    if (record.supplierSku !== null) {
      await this.pool.query(queryPair, [
        record.clientSku,
        record.supplierSku,
        record.confidenceScore,
        record.status,
        record.discrepancyReason,
        record.reviewedBy ?? null,
        record.reviewedAt ?? null
      ]);
    } else {
      await this.pool.query(queryOrphan, [
        record.clientSku,
        record.confidenceScore,
        record.status,
        record.discrepancyReason
      ]);
    }
  }

  public async getPendingReviews(limit: number): Promise<MappingRecord[]> {
    const query = `
      SELECT 
        client_sku AS "clientSku",
        supplier_sku AS "supplierSku",
        confidence_score AS "confidenceScore",
        status,
        discrepancy_reason AS "discrepancyReason",
        reviewed_by AS "reviewedBy",
        reviewed_at AS "reviewedAt"
      FROM product_mappings
      WHERE status = 'REQUIRES_REVIEW'
      ORDER BY created_at ASC
      LIMIT $1;
    `;
    const result = await this.pool.query<MappingRecord>(query, [limit]);
    return result.rows;
  }

  public async resolveAuditReview(
    clientSku: string,
    status: "CONFIRMED" | "REJECTED",
    reviewer: string
  ): Promise<void> {
    const query = `
      UPDATE product_mappings
      SET 
        status = $1,
        reviewed_by = $2,
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE client_sku = $3 AND status = 'REQUIRES_REVIEW';
    `;
    await this.pool.query(query, [status, reviewer, clientSku]);
  }
}
```

---

## 4. Invariantes y Reglas Operacionales

1. **Aislamiento Estricto de Pool (`SET LOCAL`):**
   - El uso de `set_config('pg_trgm.similarity_threshold', ..., true)` garantiza que el umbral de similitud es descartado inmediatamente al terminar la transacción (`COMMIT` o `ROLLBACK`). La conexión reutilizada por otro hilo no retiene umbrales residuales.
2. **Garantía Anti-Bucles:**
   - La condición `WHERE NOT EXISTS` en `getUnmappedClientProducts` excluye automáticamente cualquier producto cuyo `client_sku` ya exista en `product_mappings` sin importar su estado (`CONFIRMED`, `REQUIRES_REVIEW` o `REJECTED`).
3. **Manejo Seguro de Recursos:**
   - Todo cliente reservado de `pool.connect()` se libera en un bloque `finally` para evitar fugas de conexiones.

---

## 5. Criterios de Aceptación (BDD / Given-When-Then)

### Escenario 1: Búsqueda léxica aislada sin polución de conexión
- **Given** una conexión obtenida del pool.
- **When** se invoca `findSupplierCandidates("Tornillo Hex", 0.75, 3)`.
- **Then** se ejecuta `BEGIN`, se fija `pg_trgm.similarity_threshold` a `0.75` con `is_local = true`, se realiza la búsqueda y se efectúa `COMMIT`.
- **And** si la consulta subsiguiente en esa misma conexión verifica el valor por defecto de PostgreSQL, este no se encuentra alterado.

### Escenario 2: Persistencia idempotente de ítem huérfano
- **Given** un registro huérfano (`supplierSku = null`, `status = 'REJECTED'`, `discrepancyReason = 'NO_CANDIDATES_FOUND'`).
- **When** se invoca `saveMapping(record)` dos veces consecutivas para el mismo `clientSku`.
- **Then** ambas operaciones concluyen sin error y la base de datos conserva exactamente un registro actualizado.

### Escenario 3: Resolución de auditoría manual
- **Given** un registro en `product_mappings` con `status = 'REQUIRES_REVIEW'` para `client_sku = 'CLI-AUDIT-1'`.
- **When** se invoca `resolveAuditReview('CLI-AUDIT-1', 'CONFIRMED', 'admin@org.com')`.
- **Then** el registro pasa a `status = 'CONFIRMED'`, `reviewed_by = 'admin@org.com'` y `reviewed_at` se registra con la marca de tiempo actual.
