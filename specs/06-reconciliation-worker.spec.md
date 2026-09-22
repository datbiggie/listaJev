# Especificación Técnica: Orquestador del Worker de Conciliación por Lotes

**Identificador:** `SPEC-WORKER-006`  
**Archivo de Destino:** `specs/06-reconciliation-worker.spec.md`  
**Módulos Relacionados:** `src/reconciliation.worker.ts`, `src/concurrency.ts`, `src/product.repository.ts`, `src/jev-matcher.service.ts`, `src/types.ts`  
**Requerimientos SRS:** `RF-01`, `RF-02`, `RF-03`, `RF-04`, `RF-05`  
**Estado:** `Aprobado`  

---

## 1. Propósito y Alcance

Esta especificación detalla el orquestador `CatalogReconciliationWorker` y la utilidad de concurrencia acotada `mapConcurrent`.

El orquestador coordina la Fase 1 del pipeline:
1. Ingesta de lotes acotados (`BATCH_SIZE`) de productos cliente no procesados.
2. Procesamiento concurrente limitado a `MAX_CONCURRENCY` hilos asíncronos para evitar agotamiento de conexiones en el pool o saturación del rate limit del Gateway.
3. Clasificación estricta del resultado en tres estados mutuamente excluyentes: `CONFIRMED`, `REQUIRES_REVIEW` o `REJECTED`.
4. **Prevención Absoluta de Bucles Infinitos (RF-05):** Si un producto no tiene candidatos o todos son rechazados por Jev, se persiste de forma obligatoria como `REJECTED` con `supplier_sku = NULL`, garantizando que la cláusula `WHERE NOT EXISTS` no lo vuelva a extraer en ciclos subsiguientes.

---

## 2. Utilidad de Concurrencia Controlada (`concurrency.ts`)

```typescript
/**
 * Mapea una colección de elementos de forma concurrente con un límite estricto de tareas simultáneas.
 *
 * @param items - Lista inmutable de elementos a procesar.
 * @param limit - Número máximo de tareas activas concurrentes.
 * @param task - Función asíncrona que procesa cada elemento individualmente.
 * @returns Promesa que resuelve un arreglo con los resultados en el mismo orden de los elementos.
 */
export async function mapConcurrent<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await task(items[index]);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker()
  );

  await Promise.all(workers);
  return results;
}
```

---

## 3. Orquestador de Lotes (`CatalogReconciliationWorker`)

```typescript
import { IProductRepository } from "./product.repository";
import { IAiMatcherService } from "./types";
import { AppConfig } from "./config";
import { ClientProduct, MappingRecord, MappingStatus } from "./types";
import { mapConcurrent } from "./concurrency";

export class CatalogReconciliationWorker {
  constructor(
    private readonly repository: IProductRepository,
    private readonly aiMatcher: IAiMatcherService,
    private readonly config: AppConfig
  ) {}

  /**
   * Ejecuta un ciclo de procesamiento por lote de productos no conciliados.
   */
  public async runBatch(): Promise<{ processed: number; resolved: number }> {
    const unmappedProducts = await this.repository.getUnmappedClientProducts(
      this.config.BATCH_SIZE
    );

    if (unmappedProducts.length === 0) {
      return { processed: 0, resolved: 0 };
    }

    let resolvedCount = 0;

    await mapConcurrent(
      unmappedProducts,
      this.config.MAX_CONCURRENCY,
      async (clientProduct: ClientProduct) => {
        const wasResolved = await this.processProduct(clientProduct);
        if (wasResolved) {
          resolvedCount++;
        }
      }
    );

    return { processed: unmappedProducts.length, resolved: resolvedCount };
  }

  /**
   * Procesa un producto individualmente a través de bloqueo pg_trgm y evaluación Jev.
   */
  private async processProduct(product: ClientProduct): Promise<boolean> {
    const candidates = await this.repository.findSupplierCandidates(
      product.name,
      this.config.PG_TRGM_THRESHOLD,
      3
    );

    // Caso Huérfano: 0 candidatos léxicos superaron el umbral pg_trgm
    if (candidates.length === 0) {
      const orphanMapping: MappingRecord = {
        clientSku: product.sku,
        supplierSku: null,
        confidenceScore: 0.0,
        status: "REJECTED",
        discrepancyReason: "NO_CANDIDATES_FOUND"
      };
      await this.repository.saveMapping(orphanMapping);
      return false;
    }

    let matched = false;

    for (const candidate of candidates) {
      try {
        const evaluation = await this.aiMatcher.evaluateMatch(product, candidate);

        if (!evaluation.isMatch) {
          continue;
        }

        // Lógica de partición según umbrales de certeza
        const status: MappingStatus =
          evaluation.confidenceScore >= this.config.CONFIRMED_MATCH_THRESHOLD
            ? "CONFIRMED"
            : evaluation.confidenceScore >= this.config.REVIEW_MATCH_THRESHOLD
              ? "REQUIRES_REVIEW"
              : "REJECTED";

        if (status === "REJECTED") {
          continue;
        }

        const mapping: MappingRecord = {
          clientSku: product.sku,
          supplierSku: candidate.sku,
          confidenceScore: evaluation.confidenceScore,
          status,
          discrepancyReason: evaluation.discrepancyReason
        };

        await this.repository.saveMapping(mapping);
        matched = true;
        break; // Detiene la búsqueda al encontrar el primer candidato confirmado o en revisión
      } catch (error) {
        process.stderr.write(
          `Fallo en inferencia para ${product.sku} vs ${candidate.sku}: ${(error as Error).message}\n`
        );
      }
    }

    // Si ningún candidato fue confirmado o puesto en revisión, se persiste como REJECTED
    if (!matched) {
      const rejectedMapping: MappingRecord = {
        clientSku: product.sku,
        supplierSku: null,
        confidenceScore: 0.0,
        status: "REJECTED",
        discrepancyReason: "NO_CANDIDATES_FOUND"
      };
      await this.repository.saveMapping(rejectedMapping);
    }

    return matched;
  }
}
```

---

## 4. Invariantes del Pipeline

1. **Invariante de Persistencia Exhaustiva (RF-04):**
   - Es imposible que un `ClientProduct` procesado termine el flujo sin un registro en `product_mappings`.
2. **Invariante de Complejidad Temporal Acotada (RF-05):**
   - El espacio de productos no mapeados $U$ disminuye estrictamente con cada corrida: $|U_{t+1}| \le |U_t| - \text{processed}$.
3. **Invariante de No Bloqueo:**
   - Si la inferencia de un candidato individual arroja un error imprevisto, el orquestador captura el fallo, registra la bitácora en `stderr` y continúa evaluando el siguiente candidato o producto sin abortar el lote.

---

## 5. Criterios de Aceptación (BDD / Given-When-Then)

### Escenario 1: Persistencia forzada de ítem huérfano sin candidatos
- **Given** un producto de cliente sin candidatos que alcancen `PG_TRGM_THRESHOLD`.
- **When** el worker procesa el ítem en `processProduct`.
- **Then** se invoca `repository.saveMapping` con `{ clientSku, supplierSku: null, status: 'REJECTED', discrepancyReason: 'NO_CANDIDATES_FOUND' }`.

### Escenario 2: Asignación a CONFIRMED con confianza $\ge 0.90$
- **Given** un producto cliente y un candidato con evaluación `{ isMatch: true, confidenceScore: 0.95 }`.
- **When** se evalúa contra `CONFIRMED_MATCH_THRESHOLD = 0.90`.
- **Then** se persiste el registro con `status = 'CONFIRMED'`.

### Escenario 3: Asignación a REQUIRES_REVIEW con confianza intermedia
- **Given** un candidato con `{ isMatch: true, confidenceScore: 0.81 }`.
- **When** se compara con `REVIEW_MATCH_THRESHOLD = 0.70` y `CONFIRMED_MATCH_THRESHOLD = 0.90`.
- **Then** se persiste el registro con `status = 'REQUIRES_REVIEW'`.

### Escenario 4: Concurrencia máxima estrictamente respetada
- **Given** un lote de 20 productos y `MAX_CONCURRENCY = 3`.
- **When** se ejecuta `runBatch()`.
- **Then** en ningún instante de la ejecución existen más de 3 invocaciones activas simultáneas de `processProduct`.
