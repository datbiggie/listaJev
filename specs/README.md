# Suite de Especificaciones Técnicas (Spec-Driven Development)

## Sistema de Conciliación de Catálogos y Sincronización de Stock

Esta carpeta contiene las especificaciones técnicas modulares que rigen el ciclo de vida del software bajo la metodología **Spec-Driven Development (SDD)** asistida por Inteligencia Artificial. Cada archivo `.spec.md` es la **Única Fuente de Verdad (Single Source of Truth - SSOT)** para el diseño, implementación de código y validación mediante pruebas automatizadas.

El sistema implementa una arquitectura desacoplada en dos fases basada en el documento [SRS.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/SRS.md):
- **Fase 1 (Resolución Asíncrona de Identidad):** Ingesta, bloqueo léxico indexado con PostgreSQL `pg_trgm`, inferencia determinista de Sistema 1 con `typesafe-ai/jev` (Vercel AI SDK) y persistencia idempotente en `product_mappings`.
- **Fase 2 (Cruce Determinista de Stock):** Operación relacional pura en tiempo real (`LEFT JOIN`) con latencia $\le 200\text{ ms}$ sobre tablas indexadas sin inferencias probabilísticas recurrentes.

---

## 1. Principios de Diseño Transversales

Cualquier implementación generada por un agente o desarrollador debe cumplir de forma estricta con las siguientes reglas arquitectónicas:

1. **Clean Architecture y Principios SOLID:**
   - Separación estricta entre capa de datos (PostgreSQL), servicios de dominio, clientes de inferencia y orquestadores.
   - Inversión de dependencias obligatoria: los servicios dependen de interfaces abstractas (`IProductRepository`, `IAiMatcherService`, `IStockReconciliationService`), nunca de clases concretas.
2. **Inyección de Dependencias y Cero Singletons:**
   - Todo parámetro operativo (umbrales, límites, clientes de conexión) debe inyectarse a través del constructor.
   - Prohibido el uso de patrones Singleton o Facades globales.
3. **Cero Hardcoding y Validación Fail-Fast:**
   - Ninguna credencial, cadena de conexión, umbral o URL puede estar quemada en código.
   - Toda la configuración se valida en el arranque mediante esquemas Zod en `config.ts`.
4. **Contratos Centralizados (Single Source of Truth):**
   - Todas las interfaces del dominio, tipos enumerados y esquemas Zod deben residir exclusivamente en `src/types.ts`.
   - Ningún servicio ni repositorio debe declarar o duplicar tipos de entidades.
5. **Seguridad y Aislamiento en Pool de Conexiones:**
   - Toda parametrización dinámica de PostgreSQL a nivel de sesión (ej. `pg_trgm.similarity_threshold`) debe ejecutarse de forma aislada en transacciones con `SET LOCAL` o `set_config(..., true)`, evitando la contaminación de conexiones compartidas.

---

## 2. Protocolo Operativo para Agentes IA

Antes de escribir código o pruebas para un módulo, el agente o ingeniero debe seguir este protocolo:

1. **Lectura de Especificación:** Leer el archivo `.spec.md` correspondiente al módulo y verificar sus precondiciones, postcondiciones e invariantes.
2. **Inspección de Contratos:** Verificar en [01-domain-and-database.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/01-domain-and-database.spec.md) y `src/types.ts` la existencia de los tipos requeridos antes de implementar lógica.
3. **Desarrollo Guiado por Criterios de Aceptación (BDD):** Cada escenario `Given-When-Then` redactado en el spec debe traducirse directamente en una prueba unitaria o de integración en Vitest.
4. **Validación de No Regresión:** Ningún cambio puede violar los contratos de tipos Zod ni los índices únicos parciales de la base de datos.

---

## 3. Inventario de Especificaciones

| Archivo | Módulo / Componente | Alcance Principal |
| :--- | :--- | :--- |
| [01-domain-and-database.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/01-domain-and-database.spec.md) | Base de Datos (DDL) | DDL PostgreSQL, ENUM `mapping_status`, índices GIN `gin_trgm_ops`, índices únicos parciales. |
| [02-sku-normalizer.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/02-sku-normalizer.spec.md) | `src/sku-normalizer.ts` | Funciones puras de sanitización y normalización de SKUs y nombres comerciales (RF-01). |
| [03-configuration.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/03-configuration.spec.md) | `src/config.ts` | Validación Zod fail-fast de variables de entorno y tipado de configuración (RNF-04). |
| [04-product-repository.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/04-product-repository.spec.md) | `src/product.repository.ts` | Contrato `IProductRepository`, consultas con bloqueo `pg_trgm`, `SET LOCAL` transaccional, upsert y auditoría. |
| [05-jev-matcher-service.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/05-jev-matcher-service.spec.md) | `src/jev-matcher.service.ts` | Contrato `IAiMatcherService`, inferencia con `typesafe-ai/jev`, esquema Zod y backoff con jitter (RF-03, RNF-02, RNF-03). |
| [06-reconciliation-worker.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/06-reconciliation-worker.spec.md) | `src/reconciliation.worker.ts` | Orquestador por lotes, pool `mapConcurrent`, persistencia forzada de huérfanos/descartes (RF-04, RF-05). |
| [07-stock-reconciliation.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/07-stock-reconciliation.spec.md) | `src/stock-reconciliation.service.ts` | Contrato `IStockReconciliationService`, DTO de stock, consulta determinista de Fase 2 y SLA sub-200ms (RF-06, RNF-01). |
| [08-human-in-the-loop-audit.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/08-human-in-the-loop-audit.spec.md) | Dominio de Auditoría | Máquina de estados para `REQUIRES_REVIEW`, reglas de transición manual y trazabilidad (`reviewed_by`, `reviewed_at`) (RF-07). |
| [09-acceptance-and-testing.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/09-acceptance-and-testing.spec.md) | Suite de Pruebas | Matriz consolidada de pruebas unitarias aisladas con mocks y pruebas de integración sobre PostgreSQL real. |

---

## 4. Matriz de Trazabilidad Bidireccional

| Requerimiento SRS | Descripción Breve | Especificación Responsable | Componente / Archivo |
| :--- | :--- | :--- | :--- |
| **RF-01** | Normalización de SKUs y Nombres | [02-sku-normalizer.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/02-sku-normalizer.spec.md) | `src/sku-normalizer.ts` |
| **RF-02** | Bloqueo Léxico Indexado (pg_trgm) | [04-product-repository.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/04-product-repository.spec.md) | `src/product.repository.ts` |
| **RF-03** | Inferencia Determinista con Jev | [05-jev-matcher-service.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/05-jev-matcher-service.spec.md) | `src/jev-matcher.service.ts` |
| **RF-04** | Persistencia Exhaustiva de Estados | [01-domain-and-database.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/01-domain-and-database.spec.md), [06-reconciliation-worker.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/06-reconciliation-worker.spec.md) | `PostgreSQL DDL`, `src/reconciliation.worker.ts` |
| **RF-05** | Prevención de Bucles Infinitos | [04-product-repository.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/04-product-repository.spec.md), [06-reconciliation-worker.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/06-reconciliation-worker.spec.md) | `src/product.repository.ts`, `src/reconciliation.worker.ts` |
| **RF-06** | Conciliación Relacional de Inventario | [07-stock-reconciliation.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/07-stock-reconciliation.spec.md) | `src/stock-reconciliation.service.ts` |
| **RF-07** | Auditoría Human-in-the-Loop | [08-human-in-the-loop-audit.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/08-human-in-the-loop-audit.spec.md) | `src/product.repository.ts` |
| **RNF-01** | Rendimiento en Cruce ($\le 200\text{ ms}$) | [07-stock-reconciliation.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/07-stock-reconciliation.spec.md) | `PostgreSQL Indexes`, `src/stock-reconciliation.service.ts` |
| **RNF-02** | Tipado Estricto de Inferencia | [05-jev-matcher-service.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/05-jev-matcher-service.spec.md) | `src/types.ts`, `src/jev-matcher.service.ts` |
| **RNF-03** | Resiliencia y Manejo de Rate Limits | [05-jev-matcher-service.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/05-jev-matcher-service.spec.md) | `src/jev-matcher.service.ts` |
| **RNF-04** | Configuración Desacoplada | [03-configuration.spec.md](file:///c:/Users/Administrador.A2SOFTWAY/Downloads/samsung-galaxy-s24-ultra-mockup/Alternativo/List/specs/03-configuration.spec.md) | `src/config.ts` |
