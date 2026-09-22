# Especificación Técnica: Estrategia de Pruebas y Criterios de Aceptación

**Identificador:** `SPEC-TEST-009`  
**Archivo de Destino:** `specs/09-acceptance-and-testing.spec.md`  
**Módulos Relacionados:** Todo el sistema, Vitest  
**Requerimientos SRS:** `RF-01` a `RF-07`, `RNF-01` a `RNF-04`  
**Estado:** `Aprobado`  

---

## 1. Propósito y Alcance

Esta especificación formaliza la pirámide de pruebas del sistema, estableciendo una separación rigurosa entre:
1. **Pruebas Unitarias Aisladas (Fast / In-Memory):** Validación de lógica pura, contratos Zod, orquestación por lotes y reintentos utilizando mocks en Vitest sin dependencias de I/O externas.
2. **Pruebas de Integración Reales (Database-backed):** Validación contra una instancia real de PostgreSQL 15+ para verificar el comportamiento de la extensión `pg_trgm`, operadores de similitud `%`, índices GIN, índices únicos parciales e isolación transaccional con `SET LOCAL`.

---

## 2. Matriz de Estrategia de Pruebas

| Capa / Módulo | Tipo de Prueba | Estrategia de Aislamiento | Requerimientos Verificados |
| :--- | :--- | :--- | :--- |
| `sku-normalizer.ts` | Unitaria | Funciones puras sin dependencias. | `RF-01` |
| `config.ts` | Unitaria | Inyección directa de diccionarios de entorno a `loadConfig(env)`. | `RNF-04` |
| `jev-matcher.service.ts` | Unitaria | Mock de la función `experimental_evaluate` del paquete `ai`. | `RF-03`, `RNF-02`, `RNF-03` |
| `reconciliation.worker.ts` | Unitaria | Mocks de `IProductRepository` y `IAiMatcherService` con Vitest (`vi.fn()`). | `RF-04`, `RF-05` |
| `product.repository.ts` | Integración | PostgreSQL real con extensiones `pg_trgm` y transacciones de rollback. | `RF-01`, `RF-02`, `RF-04`, `RF-05`, `RF-07` |
| `stock-reconciliation.service.ts` | Integración / Rendimiento | PostgreSQL real con dataset sintetizado de 50.000 registros para benchmark de latencia. | `RF-06`, `RNF-01` |

---

## 3. Especificación de Pruebas Unitarias

### 3.1 Normalizador de SKUs (`sku-normalizer.spec.ts`)
- **TC-U-01:** Normaliza cadenas con guiones, espacios y caracteres especiales a solo alfanumérico en mayúsculas.
- **TC-U-02:** Preserva la idempotencia en SKUs previamente normalizados.
- **TC-U-03:** Sanitiza nombres comerciales colapsando tabuladores y saltos de línea a espacios simples.

### 3.2 Validación de Configuración (`config.spec.ts`)
- **TC-U-04:** Retorna configuración con valores por defecto válidos si no se sobreescriben.
- **TC-U-05:** Lanza `Error` si `DATABASE_URL` no cumple formato URI.
- **TC-U-06:** Lanza `Error` si `AI_GATEWAY_API_KEY` está vacía.
- **TC-U-07:** Rechaza la configuración si `CONFIRMED_MATCH_THRESHOLD <= REVIEW_MATCH_THRESHOLD`.

### 3.3 Servicio Jev Sistema 1 (`jev-matcher.service.spec.ts`)
- **TC-U-08:** Procesa respuestas conformes con el esquema `ProductMatchResultSchema`.
- **TC-U-09:** Intercepta respuestas malformadas (ej. `confidenceScore` string) arrojando excepción sin propagar datos corruptos.
- **TC-U-10:** Reintenta exitosamente tras fallos simulados HTTP 429 aplicando retroceso exponencial con jitter.
- **TC-U-11:** Aborta con excepción tras agotar los 3 reintentos permitidos.

### 3.4 Orquestador Worker (`reconciliation.worker.spec.ts`)
- **TC-U-12:** Si `findSupplierCandidates` retorna lista vacía, persiste inmediatamente como `REJECTED` (`NO_CANDIDATES_FOUND`).
- **TC-U-13:** Asigna estado `CONFIRMED` cuando `confidenceScore >= 0.90`.
- **TC-U-14:** Asigna estado `REQUIRES_REVIEW` cuando $0.70 \le \text{confidenceScore} < 0.90$.
- **TC-U-15:** Persiste como `REJECTED` cuando ningún candidato supera el umbral de revisión.
- **TC-U-16:** Respeta el límite máximo de concurrencia `MAX_CONCURRENCY` durante el procesamiento.

---

## 4. Especificación de Pruebas de Integración (PostgreSQL Real)

### 4.1 Repositorio y Bloqueo Léxico (`product.repository.integration.spec.ts`)
- **TC-I-01:** Verifica que el operador `%` de `pg_trgm` utiliza el índice GIN `idx_supplier_name_trgm` mediante `EXPLAIN`.
- **TC-I-02:** Valida que `findSupplierCandidates` ejecuta `set_config('pg_trgm.similarity_threshold', ..., true)` dentro de una transacción y que al liberar la conexión, esta no retiene el valor en consultas externas.
- **TC-I-03:** Verifica el rechazo de inserción duplicada en `product_mappings` para el mismo par cliente-proveedor mediante `uq_client_supplier_pair`.
- **TC-I-04:** Verifica que no se permite más de un registro huérfano para el mismo `client_sku` mediante `uq_client_rejected_orphan`.
- **TC-I-05:** Verifica que `getUnmappedClientProducts` no retorna productos previamente registrados con `status = 'REJECTED'`.

### 4.2 Cruce de Stock y Rendimiento (`stock-reconciliation.integration.spec.ts`)
- **TC-I-06:** Categoriza correctamente productos en `DISPONIBLE`, `AGOTADO`, `DESCATALOGADO_PROVEEDOR` y `NO_CATALOGADO`.
- **TC-I-07 (Benchmark RNF-01):**
  - Carga 50.000 productos de cliente y 50.000 de proveedor con sus índices activos.
  - Ejecuta `getReconciledStock()`.
  - Verifica que el tiempo total de consulta sea estrictamente menor o igual a $200\text{ ms}$.

---

## 5. Criterios de Aceptación Global para Pipeline de CI/CD

1. **100% de Cobertura de Ramas en Lógica de Dominio:** Ningún PR puede integrarse si `sku-normalizer`, `config` o `reconciliation.worker` poseen ramas no evaluadas.
2. **Cero Warnings de Tipos en TypeScript:** Compilación en modo estricto (`tsc --noEmit`) sin errores.
3. **Validación de Invariantes de Base de Datos:** Los tests de integración deben ejecutarse en un contenedor PostgreSQL efímero asegurando limpieza absoluta.
