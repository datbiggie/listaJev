# Especificación Técnica: Servicio de Conciliación Determinista de Stock (Fase 2)

**Identificador:** `SPEC-STOCK-007`  
**Archivo de Destino:** `specs/07-stock-reconciliation.spec.md`  
**Módulos Relacionados:** `src/stock-reconciliation.service.ts`, `src/types.ts`  
**Requerimientos SRS:** `RF-06`, `RNF-01`  
**Estado:** `Aprobado`  

---

## 1. Propósito y Alcance

Esta especificación formaliza el contrato y la consulta SQL determinista de la **Fase 2 (Cruce de Inventario en Tiempo Real)**.

El objetivo es computar el inventario consolidado entre el catálogo de la organización y las existencias reales reportadas por los proveedores. 

Principios rectores:
1. **Determinismo Absoluto:** Cero dependencia de modelos de IA o heurísticas difusas durante la consulta de stock.
2. **Alta Eficiencia y Baja Latencia (RNF-01):** La consulta debe ejecutarse en tiempo sub-lineal mediante uniones indexadas (`LEFT JOIN`), con una latencia objetivo $\le 200\text{ ms}$ para un universo de 50.000 registros.
3. **Clasificación Exhaustiva de Existencias:** Toda fila de producto cliente debe categorizarse inequívocamente en uno de cuatro estados de stock.

---

## 2. Contratos y DTOs (`src/types.ts`)

Importados desde `src/types.ts`:

```typescript
export type StockStatus =
  | "NO_CATALOGADO"
  | "DESCATALOGADO_PROVEEDOR"
  | "AGOTADO"
  | "DISPONIBLE";

export interface StockReconciliationItem {
  clientSku: string;
  clientProductName: string;
  supplierSku: string | null;
  supplierStock: number;
  stockStatus: StockStatus;
}

export interface IStockReconciliationService {
  /**
   * Ejecuta el cruce relacional determinista de inventario para todo el catálogo cliente.
   *
   * @returns Lista de productos con su respectivo estado de inventario calculado.
   */
  getReconciledStock(): Promise<StockReconciliationItem[]>;
}
```

---

## 3. Consulta Relacional Determinista de Fase 2

La consulta une `client_products` con `product_mappings` (filtrando estrictamente por resoluciones confirmadas) y luego con `supplier_products`:

```sql
SELECT 
    c.sku AS "clientSku",
    c.name AS "clientProductName",
    s.sku AS "supplierSku",
    COALESCE(s.current_stock, 0) AS "supplierStock",
    CASE 
        WHEN m.supplier_sku IS NULL THEN 'NO_CATALOGADO'
        WHEN s.sku IS NULL THEN 'DESCATALOGADO_PROVEEDOR'
        WHEN s.current_stock = 0 THEN 'AGOTADO'
        ELSE 'DISPONIBLE'
    END AS "stockStatus"
FROM client_products c
LEFT JOIN product_mappings m 
    ON m.client_sku = c.sku AND m.status = 'CONFIRMED'
LEFT JOIN supplier_products s 
    ON s.sku = m.supplier_sku;
```

---

## 4. Matriz de Estados de Inventario

| Estado Calculado | Condición Relacional | Significado Comercial |
| :--- | :--- | :--- |
| `NO_CATALOGADO` | No existe registro `CONFIRMED` en `product_mappings` para el `client_sku`. | El producto no ha sido resuelto o fue rechazado (`REJECTED`) o está pendiente (`REQUIRES_REVIEW`). |
| `DESCATALOGADO_PROVEEDOR` | Existe mapeo confirmado, pero el `supplier_sku` ya no existe en la tabla `supplier_products`. | El proveedor retiró el producto de su catálogo activo de existencias. |
| `AGOTADO` | Existe mapeo confirmado y el proveedor lo cataloga, pero su `current_stock` es $0$. | Quiebre de stock en el proveedor. |
| `DISPONIBLE` | Existe mapeo confirmado y `current_stock > 0`. | Producto disponible para venta y despacho con stock inmediato. |

---

## 5. Implementación de Referencia (`PostgresStockReconciliationService`)

```typescript
import { Pool } from "pg";
import { IStockReconciliationService, StockReconciliationItem } from "./types";

export class PostgresStockReconciliationService implements IStockReconciliationService {
  constructor(private readonly pool: Pool) {}

  public async getReconciledStock(): Promise<StockReconciliationItem[]> {
    const query = `
      SELECT 
        c.sku AS "clientSku",
        c.name AS "clientProductName",
        s.sku AS "supplierSku",
        COALESCE(s.current_stock, 0) AS "supplierStock",
        CASE 
          WHEN m.supplier_sku IS NULL THEN 'NO_CATALOGADO'
          WHEN s.sku IS NULL THEN 'DESCATALOGADO_PROVEEDOR'
          WHEN s.current_stock = 0 THEN 'AGOTADO'
          ELSE 'DISPONIBLE'
        END AS "stockStatus"
      FROM client_products c
      LEFT JOIN product_mappings m 
        ON m.client_sku = c.sku AND m.status = 'CONFIRMED'
      LEFT JOIN supplier_products s 
        ON s.sku = m.supplier_sku;
    `;
    const result = await this.pool.query<StockReconciliationItem>(query);
    return result.rows;
  }
}
```

---

## 6. Criterios de Aceptación (BDD / Given-When-Then)

### Escenario 1: Producto confirmado con existencias positivas
- **Given** un producto `CLI-1` mapeado con `SUP-1` en estado `CONFIRMED`.
- **And** `SUP-1` posee `current_stock = 25` en `supplier_products`.
- **When** se invoca `getReconciledStock()`.
- **Then** el ítem reporta `stockStatus: "DISPONIBLE"` y `supplierStock: 25`.

### Escenario 2: Producto en estado REQUIRES_REVIEW no confirmado
- **Given** un producto `CLI-2` con mapeo existente hacia `SUP-2`, pero en estado `REQUIRES_REVIEW`.
- **When** se evalúa el reporte de stock.
- **Then** el ítem se reporta como `"NO_CATALOGADO"` porque solo los mapeos `CONFIRMED` participan en el cálculo de inventario disponible.

### Escenario 3: Cumplimiento de SLA de latencia ($\le 200\text{ ms}$)
- **Given** una base de datos con 50.000 productos cliente y 50.000 productos proveedor debidamente indexados.
- **When** se ejecuta la consulta de conciliación determinista.
- **Then** el tiempo total de ejecución retornado por `EXPLAIN (ANALYZE, BUFFERS)` no supera los $200\text{ ms}$.
