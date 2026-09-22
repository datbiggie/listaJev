# Especificación de Requerimientos de Software (SRS)

## Sistema de Conciliación de Catálogos y Sincronización de Stock

| Metadato | Detalle |
| :--- | :--- |
| **Identificador del Documento** | SRS-CAT-SYNC-001 |
| **Versión** | 2.0.0 |
| **Estado** | Aprobado / Producción |
| **Fecha de Emisión** | 2026-09-22 |
| **Arquitectura de Referencia** | Clean Architecture / Decoupled Two-Phase Pipeline |
| **Stack Principal** | TypeScript (Node.js / Bun), PostgreSQL (`pg_trgm`), Vercel AI SDK (`typesafe-ai/jev`), Vitest |

---

## Índice de Contenidos

1. [Introducción](#1-introducción)
   - 1.1 [Propósito](#11-propósito)
   - 1.2 [Alcance del Sistema](#12-alcance-del-sistema)
   - 1.3 [Definiciones, Acrónimos y Abreviaturas](#13-definiciones-acrónimos-y-abreviaturas)
   - 1.4 [Referencias y Estándares](#14-referencias-y-estándares)
2. [Arquitectura y Justificación del Stack](#2-arquitectura-y-justificación-del-stack)
   - 2.1 [Justificación de TypeScript, PostgreSQL y Jev](#21-justificación-de-typescript-postgresql-y-jev)
   - 2.2 [Arquitectura de Dos Fases](#22-arquitectura-de-dos-fases)
   - 2.3 [Diagrama de Flujo Lógico](#23-diagrama-de-flujo-lógico)
   - 2.4 [Diagrama de Secuencia del Pipeline](#24-diagrama-de-secuencia-del-pipeline)
3. [Requerimientos del Sistema](#3-requerimientos-del-sistema)
   - 3.1 [Requerimientos Funcionales (RF)](#31-requerimientos-funcionales-rf)
   - 3.2 [Requerimientos No Funcionales (RNF)](#32-requerimientos-no-funcionales-rnf)
4. [Diseño de Datos y Contratos de Interfaz](#4-diseño-de-datos-y-contratos-de-interfaz)
   - 4.1 [Modelo Relacional (PostgreSQL DDL)](#41-modelo-relacional-postgresql-ddl)
   - 4.2 [Contrato Type-Safe y Esquema de Evaluación Jev (Zod)](#42-contrato-type-safe-y-esquema-de-evaluación-jev-zod)
   - 4.3 [Consulta de Conciliación Determinista de Stock](#43-consulta-de-conciliación-determinista-de-stock)
5. [Implementación de Referencia](#5-implementación-de-referencia)
   - 5.1 [Estructura de Módulos](#51-estructura-de-módulos)
   - 5.2 [Configuración y Variables de Entorno (config.ts)](#52-configuración-y-variables-de-entorno-configts)
   - 5.3 [Contratos de Datos y Esquemas de Dominio (types.ts)](#53-contratos-de-datos-y-esquemas-de-dominio-typests)
   - 5.4 [Función Pura de Normalización de SKUs (sku-normalizer.ts)](#54-función-pura-de-normalización-de-skus-sku-normalizerts)
   - 5.5 [Utilidad de Concurrencia Controlada (concurrency.ts)](#55-utilidad-de-concurrencia-controlada-concurrencyts)
   - 5.6 [Capa de Repositorio de Base de Datos (product.repository.ts)](#56-capa-de-repositorio-de-base-de-datos-productrepositoryts)
   - 5.7 [Servicio de Inferencia de Sistema 1 con Jev (jev-matcher.service.ts)](#57-servicio-de-inferencia-de-sistema-1-con-jev-jev-matcherservicets)
   - 5.8 [Orquestador del Worker por Lotes (reconciliation.worker.ts)](#58-orquestador-del-worker-por-lotes-reconciliationworkerts)
   - 5.9 [Servicio de Conciliación Determinista de Stock (stock-reconciliation.service.ts)](#59-servicio-de-conciliación-determinista-de-stock-stock-reconciliationservicets)
   - 5.10 [Punto de Entrada y Bootstrap (index.ts)](#510-punto-de-entrada-y-bootstrap-indexts)
6. [Manejo de Fallos, Resiliencia y Casos Borde](#6-manejo-de-fallos-resiliencia-y-casos-borde)
   - 6.1 [Mitigación de Bucles Infinitos en Ítems Huérfanos](#61-mitigación-de-bucles-infinitos-en-ítems-huérfanos)
   - 6.2 [Política de Reintentos Exponenciales y Backoff](#62-política-de-reintentos-exponenciales-y-backoff)
7. [Flujo Operativo Human-in-the-Loop](#7-flujo-operativo-human-in-the-loop)
   - 7.1 [Máquina de Estados de Mapeo](#71-máquina-de-estados-de-mapeo)
   - 7.2 [Reglas de Auditoría y Transición](#72-reglas-de-auditoría-y-transición)
8. [Suite de Pruebas Unitarias de Referencia](#8-suite-de-pruebas-unitarias-de-referencia)
9. [Matriz de Trazabilidad](#9-matriz-de-trazabilidad)

---

## 1. Introducción

### 1.1 Propósito
El presente documento de Especificación de Requerimientos de Software (SRS) formaliza los requisitos arquitectónicos, funcionales y no funcionales para la construcción del sistema de conciliación de catálogos y sincronización continua de inventario entre una organización cliente y sus proveedores externos.

### 1.2 Alcance del Sistema
El sistema resuelve la disparidad semántica y de codificación (SKU) entre productos mediante un desacoplamiento estricto en dos fases:
- **Fase 1 (Resolución Asíncrona de Identidad):** Proceso de conciliación fuera de banda (*out-of-band*) apoyado en filtros léxicos indexados (`pg_trgm`) y evaluación de Sistema 1 mediante el modelo determinista `typesafe-ai/jev` a través de Vercel AI Gateway (`ai` SDK).
- **Fase 2 (Cruce Determinista de Stock):** Operación relacional en tiempo real o encolada basada exclusivamente en uniones indexadas (`LEFT JOIN`) sobre tablas relacionales, con latencia acotada a submilisegundos y cero dependencia de inferencias probabilísticas recurrentes.

### 1.3 Definiciones, Acrónimos y Abreviaturas
- **SKU (Stock Keeping Unit):** Identificador alfanumérico único para control comercial de inventario.
- **pg_trgm:** Extensión nativa de PostgreSQL para búsqueda por similitud alfanumérica basada en trigramas.
- **Sistema 1 (Fast Evaluator / Jev):** Modelo `typesafe-ai/jev` ejecutado mediante la función `experimental_evaluate` del SDK de Vercel AI, optimizado para emitir juicios deterministas, fuertemente tipados y de ultra baja latencia sin cadenas de pensamiento redundantes.
- **Type-Safe Contract:** Esquema validado en tiempo de compilación y ejecución que garantiza la integridad estricta entre la salida de la IA y el almacenamiento persistente.
- **Idempotencia:** Garantía de que ejecuciones múltiples del worker sobre el mismo lote de datos producen exactamente el mismo estado sin duplicar registros ni incurrir en re-evaluaciones innecesarias.

### 1.4 Referencias y Estándares
- ISO/IEC/IEEE 29148:2018 (*Systems and software engineering - Requirements engineering*).
- Clean Architecture y principios SOLID.
- Vercel AI SDK Core Specification (`experimental_evaluate`).
- PostgreSQL 15+ Documentation (GIN Trigram Indexing y operadores de similitud).

---

## 2. Arquitectura y Justificación del Stack

### 2.1 Justificación de TypeScript, PostgreSQL y Jev
- **TypeScript con Zod:** Garantiza la inviolabilidad de tipos en tiempo de diseño y ejecución. La estructura de evaluación de Jev se valida contra esquemas Zod en el boundary del servicio, impidiendo que discrepancias estructurales alcancen la base de datos.
- **PostgreSQL con pg_trgm:** Permite aplicar *blocking* (reducción del espacio de búsqueda de $O(N \times M)$ a $O(N \times K)$ con $K \le 3$) utilizando el operador nativo `%` sobre índices GIN, reduciendo drásticamente el consumo de I/O.
- **Vercel AI SDK + Jev (`typesafe-ai/jev`):** A diferencia de arquitecturas basadas en LLMs generativos de propósito general (Sistema 2), Jev actúa como un evaluador formal de estado. Recibe un contexto plano (*state*) y responde a preguntas tipadas primitivas (`boolean`, `number`, `string`), reduciendo el costo operacional, mitigando alucinaciones conversacionales y minimizando la latencia.

### 2.2 Arquitectura de Dos Fases

```text
+-----------------------------------------------------------------------------------+
| FASE 1: RESOLUCIÓN ASÍNCRONA DE IDENTIDAD (Semántica / Evaluativa con Jev)        |
|                                                                                   |
|  [Catálogo Cliente]  -->  Normalización SKU  -->  Filtro pg_trgm (GIN)             |
|                                                          |                        |
|                               +--------------------------+                        |
|                               |                                                   |
|                               v                                                   |
|      [Candidatos Ambiguos: 0.60 <= Score <= 0.89]                                 |
|                               |                                                   |
|                               v                                                   |
|     Vercel AI SDK (typesafe-ai/jev vía experimental_evaluate)                     |
|                               |                                                   |
|                               v                                                   |
|                        product_mappings                                           |
|       (Estados: CONFIRMED | REQUIRES_REVIEW | REJECTED)                           |
+-----------------------------------------------------------------------------------+
                               |
                               v
+-----------------------------------------------------------------------------------+
| FASE 2: CRUCE DETERMINISTA DE STOCK (Relacional / Sub-200ms)                     |
|                                                                                   |
|  client_products  <-- [LEFT JOIN] --> product_mappings <-- [LEFT JOIN] --> Stock  |
|                                                                                   |
|  Resultado: DISPONIBLE | AGOTADO | DESCATALOGADO                                  |
+-----------------------------------------------------------------------------------+
```

### 2.3 Diagrama de Flujo Lógico

```mermaid
flowchart TD
    A["Inicio: Ingesta de Catálogos"] --> B["Sanitización y Normalización de SKUs"]
    B --> C["Búsqueda de Coincidencia Exacta por SKU Normalizado"]
    C -->|Coincidencia Exacta| D["Registrar Mapeo CONFIRMED (Score: 1.00)"]
    C -->|Sin Coincidencia| E["Consulta pg_trgm con Operador % (GIN)"]
    E --> F{"Evaluar Candidatos"}
    F -->|0 Candidatos Obtenidos| G["Registrar REJECTED (NO_CANDIDATES_FOUND)"]
    F -->|Candidatos Obtenidos| H["Evaluar con typesafe-ai/jev (evaluate)"]
    H --> I{"Resultado Jev"}
    I -->|isMatch=true y Confianza >= 0.90| D
    I -->|isMatch=true y 0.70 <= Confianza < 0.90| J["Registrar REQUIRES_REVIEW"]
    I -->|isMatch=false o Confianza < 0.70| K["Registrar REJECTED (EVALUATION_REJECTED)"]
    D --> L["product_mappings Actualizado"]
    J --> L
    K --> L
    L --> M["Fase 2: Ejecución LEFT JOIN Determinista"]
    M --> N["Generar Reporte de Stock y Quiebres"]
```

### 2.4 Diagrama de Secuencia del Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor Worker as CatalogReconciliationWorker
    participant Repo as PostgresProductRepository
    participant DB as PostgreSQL Database
    participant Jev as JevSystemOneMatcher (Vercel AI Gateway)

    Worker->>Repo: getUnmappedClientProducts(batchSize)
    Repo->>DB: SELECT client_products WHERE client_sku NOT IN (mappings)
    DB-->>Repo: Lista de productos no resueltos
    Repo-->>Worker: ClientProduct[]

    loop Procesamiento Concurrente Controlado
        Worker->>Repo: findSupplierCandidates(clientProductName, limit=3)
        Repo->>DB: SELECT supplier_products WHERE name % query ORDER BY similarity DESC
        DB-->>Repo: SupplierCandidate[]
        Repo-->>Worker: Candidatos

        alt Sin candidatos encontrados
            Worker->>Repo: saveOrphanMapping(clientSku, REJECTED, NO_CANDIDATES_FOUND)
            Repo->>DB: INSERT INTO product_mappings (client_sku, status)
        else Con candidatos
            loop Por cada candidato
                Worker->>Jev: evaluateMatch(clientProduct, candidate)
                Jev-->>Worker: ProductMatchResult (isMatch, confidence, etc.)
                alt isMatch == true && confidence >= 0.90
                    Worker->>Repo: saveMapping(CONFIRMED, score)
                    Repo->>DB: INSERT / UPDATE product_mappings
                else isMatch == true && confidence >= 0.70
                    Worker->>Repo: saveMapping(REQUIRES_REVIEW, score)
                    Repo->>DB: INSERT / UPDATE product_mappings
                else Descartado
                    Worker->>Repo: saveMapping(REJECTED, score)
                    Repo->>DB: INSERT / UPDATE product_mappings
                end
            end
        end
    end
```

---

## 3. Requerimientos del Sistema

### 3.1 Requerimientos Funcionales (RF)

| Identificador | Título | Descripción | Prioridad |
| :--- | :--- | :--- | :--- |
| **RF-01** | Normalización de SKUs y Nombres | El sistema debe sanitizar SKUs removiendo guiones, espacios y caracteres no alfanuméricos, vinculando de forma directa registros con SKUs idénticos antes de invocar algoritmos difusos. | Alta |
| **RF-02** | Bloqueo Léxico Indexado | El sistema debe filtrar el universo de productos del proveedor mediante el operador `%` de `pg_trgm`, limitando la búsqueda a un máximo de 3 candidatos concurrentes por producto. | Alta |
| **RF-03** | Inferencia Determinista con Jev | Para candidatos ambiguos, el sistema debe despachar la evaluación al modelo `typesafe-ai/jev` utilizando `experimental_evaluate` del Vercel AI SDK, forzando contratos tipados para cada variable de salida. | Alta |
| **RF-04** | Persistencia Exhaustiva de Estados | El sistema debe registrar de forma obligatoria el resultado de cada producto evaluado en `product_mappings`: `CONFIRMED` ($\ge 0.90$), `REQUIRES_REVIEW` ($0.70 - 0.89$) o `REJECTED` ($< 0.70$ o sin candidatos), impidiendo la presencia de productos sin estado persistido. | Crítica |
| **RF-05** | Prevención de Bucles Infinitos | Todo producto del cliente sin candidatos o descartado debe persistirse con estado `REJECTED`, garantizando que consultas subsiguientes de productos no resueltos no reevalúen registros previamente analizados. | Crítica |
| **RF-06** | Conciliación Relacional de Inventario | El sistema debe computar el estado del inventario cruzando `client_products`, `product_mappings` (filtrando por `CONFIRMED`) y `supplier_products` mediante una consulta puramente relacional. | Crítica |
| **RF-07** | Auditoría Human-in-the-Loop | El sistema debe permitir a operadores humanos confirmar o rechazar registros en estado `REQUIRES_REVIEW`, registrando metadatos de auditoría (`reviewed_by`, `reviewed_at`). | Media |

### 3.2 Requerimientos No Funcionales (RNF)

| Identificador | Categoría | Criterio de Aceptación | Métrica / Umbral |
| :--- | :--- | :--- | :--- |
| **RNF-01** | Rendimiento en Cruce | La consulta SQL de conciliación de stock de Fase 2 debe ejecutarse en tiempo sub-lineal mediante índices relacionales. | Latencia $\le 200\text{ ms}$ para 50.000 registros |
| **RNF-02** | Tipado Estricto de Inferencia | La interfaz de evaluación no debe depender de expresiones regulares ni de parsers de JSON frágiles sobre texto libre conversacional; debe apoyarse en contratos tipados nativos. | 0 excepciones de parseo sintáctico |
| **RNF-03** | Resiliencia y Manejo de Rate Limits | El cliente de inferencia debe manejar ráfagas HTTP 429 y 503 implementando retroceso exponencial con aleatoriedad (*jitter*) de hasta 3 intentos. | $100\%$ de recuperación ante caídas transitorias |
| **RNF-04** | Configuración Desacoplada | Prohibición absoluta de cadenas de conexión, URLs, tokens de API o umbrales numéricos quemados (*hardcoded*) en el código fuente. | $100\%$ validado vía Zod en arranque |

---

## 4. Diseño de Datos y Contratos de Interfaz

### 4.1 Modelo Relacional (PostgreSQL DDL)
El diseño implementa soporte para productos no emparejados (con `supplier_sku` `NULL`) mediante un índice único parcial, asegurando el principio de idempotencia.

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Catálogo de productos de la empresa cliente
CREATE TABLE client_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) NOT NULL UNIQUE,
    normalized_sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_client_normalized_sku ON client_products(normalized_sku);
CREATE INDEX idx_client_name_trgm ON client_products USING gin (name gin_trgm_ops);

-- Catálogo de productos provisto por el proveedor con existencias
CREATE TABLE supplier_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) NOT NULL UNIQUE,
    normalized_sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supplier_normalized_sku ON supplier_products(normalized_sku);
CREATE INDEX idx_supplier_name_trgm ON supplier_products USING gin (name gin_trgm_ops);

-- Enumerador de estados del proceso de resolución
CREATE TYPE mapping_status AS ENUM ('CONFIRMED', 'REQUIRES_REVIEW', 'REJECTED');

-- Tabla de mapeos y resoluciones semánticas
CREATE TABLE product_mappings (
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

-- Índices únicos parciales para garantizar integridad relacional y permitir nulos en supplier_sku
CREATE UNIQUE INDEX uq_client_supplier_pair 
    ON product_mappings(client_sku, supplier_sku) 
    WHERE supplier_sku IS NOT NULL;

CREATE UNIQUE INDEX uq_client_rejected_orphan 
    ON product_mappings(client_sku) 
    WHERE supplier_sku IS NULL;

CREATE INDEX idx_mapping_client_status ON product_mappings(client_sku, status);
```

### 4.2 Contrato Type-Safe y Esquema de Evaluación Jev (Zod)

```typescript
import { z } from "zod";

export const ProductMatchResultSchema = z.object({
  isMatch: z.boolean().describe("Indica si ambos registros corresponden al mismo producto comercial."),
  confidenceScore: z.number().min(0).max(1).describe("Nivel de certeza de la inferencia, normalizado de 0.0 a 1.0."),
  matchType: z.enum(["EXACT_CODE", "EQUIVALENT_VARIANT", "DIFFERENT_PRODUCT"]),
  discrepancyReason: z.enum([
    "NONE",
    "PACKAGING_DIFFERENCE",
    "SPECIFICATION_MISMATCH",
    "BRAND_MISMATCH",
    "VARIANT_MISMATCH",
    "NO_CANDIDATES_FOUND"
  ]).describe("Causal de la discrepancia identificada.")
});

export type ProductMatchResult = z.infer<typeof ProductMatchResultSchema>;
```

### 4.3 Consulta de Conciliación Determinista de Stock

```sql
SELECT 
    c.sku AS client_sku,
    c.name AS client_product_name,
    s.sku AS supplier_sku,
    COALESCE(s.current_stock, 0) AS supplier_stock,
    CASE 
        WHEN m.supplier_sku IS NULL THEN 'NO_CATALOGADO'
        WHEN s.sku IS NULL THEN 'DESCATALOGADO_PROVEEDOR'
        WHEN s.current_stock = 0 THEN 'AGOTADO'
        ELSE 'DISPONIBLE'
    END AS stock_status
FROM client_products c
LEFT JOIN product_mappings m 
    ON m.client_sku = c.sku AND m.status = 'CONFIRMED'
LEFT JOIN supplier_products s 
    ON s.sku = m.supplier_sku;
```

---

## 5. Implementación de Referencia

### 5.1 Estructura de Módulos

```text
src/
├── config.ts                    # Validación y tipado de variables de entorno (Zod)
├── types.ts                     # Interfaces del dominio y contratos de esquema (Single Source of Truth)
├── sku-normalizer.ts            # Función pura de normalización y sanitización de SKUs (RF-01)
├── concurrency.ts               # Pool de ejecución concurrente acotada
├── product.repository.ts        # Capa de acceso a PostgreSQL (SET LOCAL pg_trgm y auditoría)
├── jev-matcher.service.ts       # Cliente de inferencia Jev con Vercel AI SDK y reintentos
├── reconciliation.worker.ts     # Orquestador de pipeline y prevención de loops
├── stock-reconciliation.service.ts # Servicio de consulta determinista de stock de Fase 2
└── index.ts                     # Inyección de dependencias y ciclo de arranque
```

### 5.2 Configuración y Variables de Entorno (`config.ts`)

```typescript
import { z } from "zod";

const EnvironmentSchema = z.object({
  DATABASE_URL: z.string().url(),
  AI_GATEWAY_API_KEY: z.string().min(1),
  JEV_MODEL_ID: z.string().default("typesafe-ai/jev"),
  BATCH_SIZE: z.coerce.number().int().positive().default(50),
  MAX_CONCURRENCY: z.coerce.number().int().positive().default(5),
  PG_TRGM_THRESHOLD: z.coerce.number().min(0).max(1).default(0.60),
  CONFIRMED_MATCH_THRESHOLD: z.coerce.number().min(0).max(1).default(0.90),
  REVIEW_MATCH_THRESHOLD: z.coerce.number().min(0).max(1).default(0.70)
});

export type AppConfig = z.infer<typeof EnvironmentSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = EnvironmentSchema.safeParse(env);

  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");
    throw new Error(`Configuración de entorno inválida: ${errorDetails}`);
  }

  return result.data;
}
```

### 5.3 Contratos de Datos y Esquemas de Dominio (`types.ts`)

```typescript
import { z } from "zod";

export const ProductMatchResultSchema = z.object({
  isMatch: z.boolean().describe("Indica si ambos registros corresponden al mismo producto comercial."),
  confidenceScore: z.number().min(0).max(1).describe("Nivel de certeza de la inferencia, normalizado de 0.0 a 1.0."),
  matchType: z.enum(["EXACT_CODE", "EQUIVALENT_VARIANT", "DIFFERENT_PRODUCT"]),
  discrepancyReason: z.enum([
    "NONE",
    "PACKAGING_DIFFERENCE",
    "SPECIFICATION_MISMATCH",
    "BRAND_MISMATCH",
    "VARIANT_MISMATCH",
    "NO_CANDIDATES_FOUND"
  ]).describe("Causal de la discrepancia identificada.")
});

export type ProductMatchResult = z.infer<typeof ProductMatchResultSchema>;

export type MappingStatus = "CONFIRMED" | "REQUIRES_REVIEW" | "REJECTED";

export type StockStatus =
  | "NO_CATALOGADO"
  | "DESCATALOGADO_PROVEEDOR"
  | "AGOTADO"
  | "DISPONIBLE";

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

export interface StockReconciliationItem {
  clientSku: string;
  clientProductName: string;
  supplierSku: string | null;
  supplierStock: number;
  stockStatus: StockStatus;
}
```

### 5.4 Función Pura de Normalización de SKUs (`sku-normalizer.ts`)

```typescript
export function normalizeSku(rawSku: string): string {
  return rawSku.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function sanitizeProductName(rawName: string): string {
  return rawName.trim().replace(/\s+/g, " ");
}
```

### 5.5 Utilidad de Concurrencia Controlada (`concurrency.ts`)

```typescript
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

### 5.6 Capa de Repositorio de Base de Datos (`product.repository.ts`)

```typescript
import { Pool } from "pg";
import { ClientProduct, MappingRecord, SupplierCandidate } from "./types";

export interface IProductRepository {
  getUnmappedClientProducts(limit: number): Promise<ClientProduct[]>;
  findSupplierCandidates(
    clientProductName: string,
    similarityThreshold: number,
    limit: number
  ): Promise<SupplierCandidate[]>;
  saveMapping(record: MappingRecord): Promise<void>;
  getPendingReviews(limit: number): Promise<MappingRecord[]>;
  resolveAuditReview(
    clientSku: string,
    status: "CONFIRMED" | "REJECTED",
    reviewer: string
  ): Promise<void>;
}

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
      await client.query("BEGIN;");
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
      client.release();
    }
  }

  public async saveMapping(record: MappingRecord): Promise<void> {
    const query = `
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

    const fallbackOrphanQuery = `
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
      await this.pool.query(query, [
        record.clientSku,
        record.supplierSku,
        record.confidenceScore,
        record.status,
        record.discrepancyReason,
        record.reviewedBy ?? null,
        record.reviewedAt ?? null
      ]);
    } else {
      await this.pool.query(fallbackOrphanQuery, [
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

### 5.7 Servicio de Inferencia de Sistema 1 con Jev (`jev-matcher.service.ts`)

```typescript
import { experimental_evaluate as evaluate } from "ai";
import {
  ClientProduct,
  ProductMatchResult,
  ProductMatchResultSchema,
  SupplierCandidate
} from "./types";

export interface IAiMatcherService {
  evaluateMatch(
    clientProduct: ClientProduct,
    candidate: SupplierCandidate
  ): Promise<ProductMatchResult>;
}

export class JevSystemOneMatcher implements IAiMatcherService {
  private readonly maxRetries = 3;
  private readonly initialDelayMs = 400;

  constructor(private readonly modelId: string) {}

  public async evaluateMatch(
    clientProduct: ClientProduct,
    candidate: SupplierCandidate
  ): Promise<ProductMatchResult> {
    const statePayload = JSON.stringify({
      clientProduct: {
        sku: clientProduct.sku,
        name: clientProduct.name
      },
      supplierCandidate: {
        sku: candidate.sku,
        name: candidate.name,
        lexicalSimilarityScore: candidate.similarityScore
      }
    });

    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        const rawEvaluation = await evaluate({
          model: this.modelId,
          state: statePayload,
          questions: {
            isMatch: {
              type: "boolean",
              instructions: "Determina si ambos registros corresponden al mismo producto fisico y comercial exacto."
            },
            confidenceScore: {
              type: "number",
              instructions: "Nivel de certeza de la inferencia, escala 0.0 a 1.0."
            },
            matchType: {
              type: "string",
              instructions: "Clasifica: EXACT_CODE, EQUIVALENT_VARIANT o DIFFERENT_PRODUCT."
            },
            discrepancyReason: {
              type: "string",
              instructions: "Clasifica discrepancia: NONE, PACKAGING_DIFFERENCE, SPECIFICATION_MISMATCH, BRAND_MISMATCH o VARIANT_MISMATCH."
            }
          }
        });

        const validation = ProductMatchResultSchema.safeParse(rawEvaluation);
        if (!validation.success) {
          throw new Error(`Contrato de tipos violado: ${validation.error.message}`);
        }

        return validation.data;
      } catch (error) {
        attempt++;
        if (attempt >= this.maxRetries) {
          throw new Error(`Fallo de inferencia Jev tras ${this.maxRetries} intentos: ${(error as Error).message}`);
        }
        const delay = this.initialDelayMs * Math.pow(2, attempt) + Math.random() * 100;
        await new Promise((res) => setTimeout(res, delay));
      }
    }

    throw new Error("Estado inalcanzable en evaluador Jev.");
  }
}
```

### 5.8 Orquestador del Worker por Lotes (`reconciliation.worker.ts`)

```typescript
import { IProductRepository } from "./product.repository";
import { IAiMatcherService } from "./ai-matcher.service";
import { AppConfig } from "./config";
import { ClientProduct, MappingRecord, MappingStatus } from "./types";
import { mapConcurrent } from "./concurrency";

export class CatalogReconciliationWorker {
  constructor(
    private readonly repository: IProductRepository,
    private readonly aiMatcher: IAiMatcherService,
    private readonly config: AppConfig
  ) {}

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

  private async processProduct(product: ClientProduct): Promise<boolean> {
    const candidates = await this.repository.findSupplierCandidates(
      product.name,
      this.config.PG_TRGM_THRESHOLD,
      3
    );

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
        break;
      } catch (error) {
        process.stderr.write(
          `Error en inferencia para ${product.sku} vs ${candidate.sku}: ${(error as Error).message}\n`
        );
      }
    }

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

### 5.9 Servicio de Conciliación Determinista de Stock (`stock-reconciliation.service.ts`)

```typescript
import { Pool } from "pg";
import { StockReconciliationItem } from "./types";

export interface IStockReconciliationService {
  getReconciledStock(): Promise<StockReconciliationItem[]>;
}

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

### 5.10 Punto de Entrada y Bootstrap (`index.ts`)

```typescript
import { Pool } from "pg";
import { loadConfig } from "./config";
import { PostgresProductRepository } from "./product.repository";
import { JevSystemOneMatcher } from "./jev-matcher.service";
import { CatalogReconciliationWorker } from "./reconciliation.worker";

async function main(): Promise<void> {
  const config = loadConfig();

  const pool = new Pool({
    connectionString: config.DATABASE_URL,
    max: config.MAX_CONCURRENCY + 2
  });

  const repository = new PostgresProductRepository(pool);
  const aiMatcher = new JevSystemOneMatcher(config.JEV_MODEL_ID);
  const worker = new CatalogReconciliationWorker(repository, aiMatcher, config);

  try {
    const { processed, resolved } = await worker.runBatch();
    process.stdout.write(
      `Lote procesado. Registros procesados: ${processed}, Mapeados con exito: ${resolved}\n`
    );
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`Fallo de ejecucion: ${(err as Error).stack}\n`);
  process.exit(1);
});
```

---

## 6. Manejo de Fallos, Resiliencia y Casos Borde

### 6.1 Mitigación de Bucles Infinitos en Ítems Huérfanos
Todo producto del cliente procesado que resulte sin candidatos en `pg_trgm` o cuyos candidatos sean rechazados por Jev es insertado de inmediato en `product_mappings` con `supplier_sku = NULL`, `status = 'REJECTED'` y causal `'NO_CANDIDATES_FOUND'`.

La consulta `getUnmappedClientProducts` implementa la cláusula `WHERE NOT EXISTS (SELECT 1 FROM product_mappings m WHERE m.client_sku = c.sku)`. Esto asegura que los ítems descartados no vuelvan a ser consultados en ejecuciones posteriores, garantizando una complejidad temporal estable.

### 6.2 Política de Reintentos Exponenciales y Backoff
Ante respuestas con código HTTP 429 (*Rate Limit*) o 503 (*Service Unavailable*) en Vercel AI Gateway, el cliente aplica una pausa calculada mediante:

$$\text{Delay} = \text{initialDelay} \times 2^{\text{attempt}} + \text{jitter}$$

Se fija un umbral máximo de 3 reintentos. Si se supera, se lanza una excepción controlada para que el orquestador registre la falla sin colapsar el proceso principal.

---

## 7. Flujo Operativo Human-in-the-Loop

### 7.1 Máquina de Estados de Mapeo

```mermaid
stateDiagram-v2
    [*] --> Ingesta
    Ingesta --> EvaluacionJev: Similitud Léxica pg_trgm >= 0.60
    Ingesta --> REJECTED: Sin candidatos encontrados

    EvaluacionJev --> CONFIRMED: isMatch=true & Score >= 0.90
    EvaluacionJev --> REQUIRES_REVIEW: isMatch=true & 0.70 <= Score < 0.90
    EvaluacionJev --> REJECTED: isMatch=false o Score < 0.70

    state REQUIRES_REVIEW {
        [*] --> AuditoriaPendiente
        AuditoriaPendiente --> ManualAprobado: Operador valida equivalencia
        AuditoriaPendiente --> ManualRechazado: Operador invalida candidato
    }

    ManualAprobado --> CONFIRMED: Actualizar reviewed_by / reviewed_at
    ManualRechazado --> REJECTED: Actualizar reviewed_by / reviewed_at

    CONFIRMED --> Fase2Stock: Activo para calculo determinista de inventario
    REJECTED --> [*]: Excluido permanentemente del cruce
```

### 7.2 Reglas de Auditoría y Transición
- Los registros en estado `REQUIRES_REVIEW` quedan temporalmente excluidos de la Fase 2 (cálculo de stock) hasta que un operador formalice la relación en base de datos.
- Cada transición manual exige el registro de la identidad del auditor (`reviewed_by`) y la marca temporal (`reviewed_at`), garantizando trazabilidad regulatoria y de negocio.

---

## 8. Suite de Pruebas Unitarias de Referencia

Pruebas en Vitest con aislamiento de capas mediante mocks:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CatalogReconciliationWorker } from "./reconciliation.worker";
import { IProductRepository } from "./product.repository";
import { IAiMatcherService } from "./ai-matcher.service";
import { AppConfig } from "./config";
import { ClientProduct, SupplierCandidate, ProductMatchResult } from "./types";

describe("CatalogReconciliationWorker con Jev", () => {
  let mockRepo: IProductRepository;
  let mockMatcher: IAiMatcherService;
  let config: AppConfig;
  let worker: CatalogReconciliationWorker;

  const mockProduct: ClientProduct = {
    id: "prod-1",
    sku: "SKU-CLI-100",
    normalizedSku: "SKUCLI100",
    name: "Tornillo Hexagonal 1/2 pulgada"
  };

  const mockCandidate: SupplierCandidate = {
    sku: "SUP-HEX-050",
    normalizedSku: "SUPHEX050",
    name: "Tornillo Hex 1/2 in",
    similarityScore: 0.78
  };

  beforeEach(() => {
    mockRepo = {
      getUnmappedClientProducts: vi.fn(),
      findSupplierCandidates: vi.fn(),
      saveMapping: vi.fn()
    };
    mockMatcher = {
      evaluateMatch: vi.fn()
    };
    config = {
      DATABASE_URL: "postgresql://user:pass@localhost:5432/test",
      AI_GATEWAY_API_KEY: "secret-gateway-key",
      JEV_MODEL_ID: "typesafe-ai/jev",
      BATCH_SIZE: 10,
      MAX_CONCURRENCY: 2,
      PG_TRGM_THRESHOLD: 0.60,
      CONFIRMED_MATCH_THRESHOLD: 0.90,
      REVIEW_MATCH_THRESHOLD: 0.70
    };
    worker = new CatalogReconciliationWorker(mockRepo, mockMatcher, config);
  });

  it("debe persistir como REJECTED (huérfano) si pg_trgm no halla candidatos para evitar loops", async () => {
    vi.mocked(mockRepo.getUnmappedClientProducts).mockResolvedValue([mockProduct]);
    vi.mocked(mockRepo.findSupplierCandidates).mockResolvedValue([]);

    const res = await worker.runBatch();

    expect(res.processed).toBe(1);
    expect(res.resolved).toBe(0);
    expect(mockRepo.saveMapping).toHaveBeenCalledWith({
      clientSku: "SKU-CLI-100",
      supplierSku: null,
      confidenceScore: 0,
      status: "REJECTED",
      discrepancyReason: "NO_CANDIDATES_FOUND"
    });
  });

  it("debe asignar CONFIRMED cuando Jev valida equivalencia con confianza >= 0.90", async () => {
    vi.mocked(mockRepo.getUnmappedClientProducts).mockResolvedValue([mockProduct]);
    vi.mocked(mockRepo.findSupplierCandidates).mockResolvedValue([mockCandidate]);

    const jevResponse: ProductMatchResult = {
      isMatch: true,
      confidenceScore: 0.94,
      matchType: "EQUIVALENT_VARIANT",
      discrepancyReason: "NONE"
    };

    vi.mocked(mockMatcher.evaluateMatch).mockResolvedValue(jevResponse);

    const res = await worker.runBatch();

    expect(res.processed).toBe(1);
    expect(res.resolved).toBe(1);
    expect(mockRepo.saveMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        clientSku: "SKU-CLI-100",
        supplierSku: "SUP-HEX-050",
        confidenceScore: 0.94,
        status: "CONFIRMED"
      })
    );
  });

  it("debe asignar REQUIRES_REVIEW si Jev arroja confianza entre 0.70 y 0.89", async () => {
    vi.mocked(mockRepo.getUnmappedClientProducts).mockResolvedValue([mockProduct]);
    vi.mocked(mockRepo.findSupplierCandidates).mockResolvedValue([mockCandidate]);

    const jevResponse: ProductMatchResult = {
      isMatch: true,
      confidenceScore: 0.82,
      matchType: "EQUIVALENT_VARIANT",
      discrepancyReason: "PACKAGING_DIFFERENCE"
    };

    vi.mocked(mockMatcher.evaluateMatch).mockResolvedValue(jevResponse);

    const res = await worker.runBatch();

    expect(res.processed).toBe(1);
    expect(res.resolved).toBe(1);
    expect(mockRepo.saveMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        clientSku: "SKU-CLI-100",
        supplierSku: "SUP-HEX-050",
        confidenceScore: 0.82,
        status: "REQUIRES_REVIEW"
      })
    );
  });
});
```

---

## 9. Matriz de Trazabilidad

| Requerimiento | Componente(s) Responsable(s) | Mecanismo de Verificación |
| :--- | :--- | :--- |
| **RF-01 (Normalización)** | `client_products`, `supplier_products` | Pruebas de unicidad e índices de búsqueda sobre `normalized_sku`. |
| **RF-02 (Bloqueo Léxico)** | `PostgresProductRepository.findSupplierCandidates` | `EXPLAIN ANALYZE` en PostgreSQL confirmando uso de `name_trgm` vía operador `%`. |
| **RF-03 (Inferencia Jev)** | `JevSystemOneMatcher` (`experimental_evaluate`) | Validación de llamadas a Vercel AI SDK verificando contrato Zod estricto. |
| **RF-04 (Persistencia)** | `PostgresProductRepository.saveMapping` | Test de integración verificando inserción en `product_mappings`. |
| **RF-05 (Prevención de Loops)** | `reconciliation.worker.ts`, cláusula `WHERE NOT EXISTS` | Test unitario verificando persistencia de huérfanos con `status = 'REJECTED'`. |
| **RF-06 (Cruce de Stock)** | Consulta SQL Conciliación Determinista | Medición de tiempo de ejecución con dataset de 50.000 filas ($\le 200\text{ ms}$). |
| **RF-07 (Auditoría)** | Columnas `reviewed_by` y `reviewed_at` en DDL | Prueba de transición manual de estados preservando trazabilidad. |
| **RNF-01 (Latencia)** | Índices en `product_mappings` y `client_products` | Benchmark en base de datos PostgreSQL en entorno de staging. |
| **RNF-02 (Type Safety)** | `ProductMatchResultSchema.safeParse` | Verificación de intercepción ante respuestas malformadas de Jev. |
| **RNF-03 (Resiliencia)** | Bucle de reintentos en `JevSystemOneMatcher` | Test con mock forzando 2 fallos 429 continuos antes de resolución exitosa. |
| **RNF-04 (Cero Hardcoding)** | `config.ts` (`loadConfig`) | Test de inicialización validando aborto controlado ante variables nulas. |