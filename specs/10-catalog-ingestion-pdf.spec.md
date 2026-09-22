# Especificación Técnica: Módulo de Ingesta y Extracción de Catálogos en PDF (unpdf)

**Identificador:** `SPEC-INGEST-PDF-010`  
**Archivo de Destino:** `specs/10-catalog-ingestion-pdf.spec.md`  
**Módulos Target:** `src/ingestion/unpdf-extractor.ts`, `src/ingestion/catalog-ingestion.service.ts`, `src/actions/ingest-catalog.action.ts`  
**Requerimientos SRS:** `RF-01`, `RF-08`, `RNF-01`  
**Estado:** `Aprobado`  

---

| Metadato | Detalle |
| :--- | :--- |
| **Identificador de Spec** | `SPEC-INGEST-PDF-010` |
| **Versión** | `1.0.0` |
| **Requerimientos Asociados** | `RF-01` (Normalización), `RF-08` (Ingesta de Catálogos PDF), `RNF-01` (Rendimiento) |
| **Módulos Target** | `src/ingestion/unpdf-extractor.ts`, `src/ingestion/catalog-ingestion.service.ts`, `src/actions/ingest-catalog.action.ts` |
| **Dependencias Externas** | `unpdf`, `zod`, `pg` |

---

## 1. Alcance y Propósito

Especificar la arquitectura, contratos tipados y lógica de procesamiento para la extracción de catálogos y listas de precios suministrados en formato PDF (tanto del cliente como del proveedor).

El procesamiento debe ejecutarse en el servidor (Node.js runtime en Next.js) procesando el archivo en memoria (buffer), extrayendo el contenido textual por páginas mediante `unpdf`, sanitizando los registros mediante `normalizeSku` y `sanitizeProductName`, y persistiendo los datos de forma masiva e idempotente en PostgreSQL (`client_products` o `supplier_products`).

---

## 2. Contratos de Dominio y Esquemas Zod

Los contratos deben integrarse en `src/types.ts` para mantener la Única Fuente de Verdad (SSOT):

```typescript
import { z } from "zod";

export const CatalogTargetSchema = z.enum(["CLIENT", "SUPPLIER"]);
export type CatalogTarget = z.infer<typeof CatalogTargetSchema>;

export const ExtractedCatalogItemSchema = z.object({
  rawSku: z.string().min(1).describe("Código o referencia original detectada en el documento."),
  rawName: z.string().min(1).describe("Descripción o denominación del producto."),
  stock: z.number().int().nonnegative().optional().default(0).describe("Cantidad en existencia (aplica prioritariamente a proveedores).")
});
export type ExtractedCatalogItem = z.infer<typeof ExtractedCatalogItemSchema>;

export const IngestionSummarySchema = z.object({
  target: CatalogTargetSchema,
  totalPages: z.number().int().nonnegative(),
  extractedCount: z.number().int().nonnegative(),
  persistedCount: z.number().int().nonnegative(),
  discardedCount: z.number().int().nonnegative(),
  executionTimeMs: z.number().nonnegative()
});
export type IngestionSummary = z.infer<typeof IngestionSummarySchema>;
```

---

## 3. Arquitectura del Pipeline de Ingesta

```plaintext
[ PDF Buffer (ArrayBuffer) ]
             │
             ▼
┌────────────────────────────────────────┐
│ 1. unpdf Extractor (Page-by-Page)      │ (Evita desbordamiento de memoria RAM)
└────────────────────┬───────────────────┘
                     │ Text Block por página
                     ▼
┌────────────────────────────────────────┐
│ 2. Line Parser & Tokenizer             │ (Extracción determinista de SKU, Nombre, Stock)
└────────────────────┬───────────────────┘
                     │ ExtractedCatalogItem[]
                     ▼
┌────────────────────────────────────────┐
│ 3. Normalizer Layer (Puro)             │ (normalizeSku, sanitizeProductName)
└────────────────────┬───────────────────┘
                     │ Sanitized Records
                     ▼
┌────────────────────────────────────────┐
│ 4. Bulk Upsert (PostgreSQL)            │ (ON CONFLICT DO UPDATE)
└────────────────────────────────────────┘
```

---

## 4. Especificación de Componentes e Interfaces

### 4.1 Extractor Adaptativo unpdf (`src/ingestion/unpdf-extractor.ts`)

Contrato de la interfaz extractora:

```typescript
import { ExtractedCatalogItem } from "../types";

export interface IPdfExtractor {
  extractItems(pdfBuffer: ArrayBuffer): Promise<{ items: ExtractedCatalogItem[]; totalPages: number }>;
}
```

#### Reglas de parsing por línea:
- Se itera página a página (`pageNumber: 1..numPages`) mediante `getDocumentProxy` y `extractText` de `unpdf`.
- Las líneas se limpian eliminando encabezados recurrentes (páginas, números de página, fechas, títulos de reporte).
- Se aplica un analizador léxico (*regex pattern matcher*) sobre cada línea con separadores comunes (tabuladores, `|`, dos o más espacios continuos, o punto y coma):
  - **Patrón tabular estándar:**
    ```regex
    ^\s*(?<sku>[A-Za-z0-9\-_\.\/]{3,})\s{2,}|\t|\|(?<name>.+?)(?:\s{2,}|\t|\|(?<stock>\d+))?\s*$
    ```
- Si una línea no contiene un SKU alfanumérico válido ($\ge 3$ caracteres), se descarta de forma segura sin emitir excepciones no controladas.

---

### 4.2 Servicio de Ingesta (`src/ingestion/catalog-ingestion.service.ts`)

```typescript
import { IPdfExtractor } from "./unpdf-extractor";
import { IProductRepository } from "../product.repository";
import { CatalogTarget, IngestionSummary } from "../types";

export interface ICatalogIngestionService {
  processCatalogPdf(
    buffer: ArrayBuffer,
    target: CatalogTarget
  ): Promise<IngestionSummary>;
}
```

#### Comportamiento operacional:
1. Recibe el `ArrayBuffer` del archivo y el destino (`CLIENT` o `SUPPLIER`).
2. Delega la extracción al `IPdfExtractor`.
3. Por cada registro extraído:
   - Aplica `normalizeSku(rawSku)`.
   - Aplica `sanitizeProductName(rawName)`.
4. Ejecuta persistencia por lotes en chunks de 500 registros utilizando una transacción relacional:
   - **Destino CLIENT:** Inserción en `client_products (sku, normalized_sku, name) ON CONFLICT (sku) DO UPDATE SET normalized_sku = EXCLUDED.normalized_sku, name = EXCLUDED.name`.
   - **Destino SUPPLIER:** Inserción en `supplier_products (sku, normalized_sku, name, current_stock) ON CONFLICT (sku) DO UPDATE SET normalized_sku = EXCLUDED.normalized_sku, name = EXCLUDED.name, current_stock = EXCLUDED.current_stock, updated_at = CURRENT_TIMESTAMP`.
5. Retorna la métrica estructurada `IngestionSummary`.

---

### 4.3 Server Action para Next.js (`src/actions/ingest-catalog.action.ts`)

Punto de entrada compatible con Server Actions y React Server Components:

```typescript
"use server";

import { CatalogTarget } from "../types";

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function ingestCatalogAction(
  formData: FormData
): Promise<ActionResult<IngestionSummary>>;
```

#### Validaciones requeridas en el Action:
1. Extracción del archivo desde `formData.get("file") as File`.
2. Validación MIME: `application/pdf`.
3. Límite máximo de tamaño de archivo: parametrizable vía configuración (default: 25 MB).
4. Conversión a `ArrayBuffer` mediante `await file.arrayBuffer()`.

---

## 5. Invariantes y Reglas de Negocio

1. **Gestión de Memoria en Runtime:** Prohibido concatenar el texto de todas las páginas de un documento de más de 100 páginas en una única variable de cadena (`string`). El procesamiento debe procesar y liberar el buffer de texto página por página.
2. **Idempotencia Absoluta:** La re-subida del mismo archivo PDF no debe duplicar productos ni provocar errores de clave foránea; debe actualizar existencias y nombres mediante `ON CONFLICT (sku) DO UPDATE`.
3. **Aislamiento de Errores por Página:** Un error sintáctico o línea ilegible en la página $N$ no debe abortar la ingesta de las páginas $1$ a $N-1$ ni $N+1$. Las líneas no parseables se registran como descartes en `discardedCount`.
4. **Cero Dependencias Nativas:** Está estrictamente prohibido instalar binarios externos de C++ (`canvas`, `poppler-utils`, `pdf2json`). Todo debe ejecutarse mediante JavaScript puro sobre `unpdf`.

---

## 6. Criterios de Aceptación (BDD / Given-When-Then)

### Escenario 1: Extracción y sanitización exitosa de catálogo cliente
- **Given** un archivo PDF vectorial de 5 páginas con formato de tabla estándar.
- **When** se invoca `processCatalogPdf(buffer, "CLIENT")`.
- **Then** debe invocar `normalizeSku` y `sanitizeProductName` para cada producto.
- **And** debe persistir los registros en la tabla `client_products`.
- **And** `IngestionSummary.persistedCount` debe coincidir con el total de filas válidas procesadas.

### Escenario 2: Actualización de stock de proveedor existente
- **Given** un SKU `FILT-001` existente en `supplier_products` con `current_stock = 10`.
- **When** se procesa un PDF de proveedor donde `FILT-001` reporta `stock = 0`.
- **Then** el registro en la base de datos debe actualizarse a `current_stock = 0`.
- **And** `updated_at` debe reflejar la fecha y hora de la transacción.

### Escenario 3: Rechazo de archivos no válidos o corruptos
- **Given** un buffer binario corrupto o un archivo que no sea un PDF válido.
- **When** se ejecuta `processCatalogPdf(buffer, target)`.
- **Then** el servicio debe capturar el fallo de `unpdf`, registrar el log de error y lanzar una excepción controlada sin dejar transacciones abiertas en el pool de PostgreSQL.