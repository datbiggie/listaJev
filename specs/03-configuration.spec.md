# Especificación Técnica: Configuración y Validación de Entorno

**Identificador:** `SPEC-CONF-003`  
**Archivo de Destino:** `specs/03-configuration.spec.md`  
**Módulos Relacionados:** `src/config.ts`, `src/types.ts`  
**Requerimientos SRS:** `RNF-04`  
**Estado:** `Aprobado`  

---

## 1. Propósito y Alcance

Esta especificación establece el mecanismo centralizado de validación y tipado de variables de entorno para la aplicación. 

En cumplimiento estricto del requerimiento **RNF-04 (Cero Hardcoding)** y el principio **Fail-Fast**:
1. Toda variable de entorno es validada y parseada al inicio del proceso mediante un esquema Zod.
2. Si alguna variable requerida falta o incumple las restricciones de formato o rango, el sistema aborta de inmediato la ejecución arrojando una traza detallada de los errores.
3. Se prohíbe el acceso directo a `process.env` en cualquier otro módulo de la aplicación. Todos los componentes reciben sus dependencias y parámetros a través de constructores (`AppConfig`).

---

## 2. Contratos y Esquema Zod

El módulo `src/config.ts` define y expone:

```typescript
import { z } from "zod";

export const EnvironmentSchema = z.object({
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL debe ser una URI válida de conexión PostgreSQL"),
  AI_GATEWAY_API_KEY: z
    .string()
    .min(1, "AI_GATEWAY_API_KEY es obligatoria para la comunicación con Vercel AI Gateway"),
  JEV_MODEL_ID: z
    .string()
    .min(1)
    .default("typesafe-ai/jev"),
  BATCH_SIZE: z.coerce
    .number()
    .int()
    .positive("BATCH_SIZE debe ser un entero positivo")
    .default(50),
  MAX_CONCURRENCY: z.coerce
    .number()
    .int()
    .positive("MAX_CONCURRENCY debe ser un entero positivo")
    .default(5),
  PG_TRGM_THRESHOLD: z.coerce
    .number()
    .min(0.0)
    .max(1.0, "PG_TRGM_THRESHOLD debe encontrarse en el rango [0.0, 1.0]")
    .default(0.60),
  CONFIRMED_MATCH_THRESHOLD: z.coerce
    .number()
    .min(0.0)
    .max(1.0, "CONFIRMED_MATCH_THRESHOLD debe encontrarse en el rango [0.0, 1.0]")
    .default(0.90),
  REVIEW_MATCH_THRESHOLD: z.coerce
    .number()
    .min(0.0)
    .max(1.0, "REVIEW_MATCH_THRESHOLD debe encontrarse en el rango [0.0, 1.0]")
    .default(0.70)
}).refine(
  (data) => data.CONFIRMED_MATCH_THRESHOLD > data.REVIEW_MATCH_THRESHOLD,
  {
    message: "CONFIRMED_MATCH_THRESHOLD debe ser estrictamente mayor que REVIEW_MATCH_THRESHOLD",
    path: ["CONFIRMED_MATCH_THRESHOLD"]
  }
);

export type AppConfig = z.infer<typeof EnvironmentSchema>;

/**
 * Carga y valida la configuración del sistema.
 * 
 * @param env - Diccionario de variables de entorno (por defecto process.env).
 * @returns Configuración validada y tipada como AppConfig.
 * @throws Error descriptivo si la validación falla (fail-fast).
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig;
```

---

## 3. Invariantes Operativas

1. **Invariante de Umbrales Coherentes:**
   - Debe cumplirse siempre: $\text{PG\_TRGM\_THRESHOLD} \le \text{REVIEW\_MATCH\_THRESHOLD} < \text{CONFIRMED\_MATCH\_THRESHOLD}$.
2. **Inmutabilidad:**
   - El objeto retornado por `loadConfig` debe tratarse como de solo lectura durante todo el ciclo de vida del runtime.
3. **Inyección Limpia:**
   - La función `loadConfig` acepta el diccionario `env` como parámetro, permitiendo testear configuraciones arbitrarias en Vitest sin contaminar `process.env`.

---

## 4. Criterios de Aceptación (BDD / Given-When-Then)

### Escenario 1: Carga exitosa con valores válidos y defaults
- **Given** un conjunto de variables de entorno con `DATABASE_URL = "postgresql://user:pass@localhost:5432/db"` y `AI_GATEWAY_API_KEY = "token-valido"`.
- **When** se invoca `loadConfig(env)`.
- **Then** el objeto devuelto contiene los valores provistos y los defaults asignados (`BATCH_SIZE: 50`, `MAX_CONCURRENCY: 5`, `PG_TRGM_THRESHOLD: 0.60`, etc.).

### Escenario 2: Aborto controlado por falta de API Key (Fail-Fast)
- **Given** un entorno donde `AI_GATEWAY_API_KEY` está ausente o es una cadena vacía.
- **When** se ejecuta `loadConfig(env)`.
- **Then** la función lanza una excepción `Error` cuyo mensaje detalla `AI_GATEWAY_API_KEY: AI_GATEWAY_API_KEY es obligatoria`.

### Escenario 3: Aborto por URL de base de datos malformada
- **Given** un entorno donde `DATABASE_URL = "no-es-una-url"`.
- **When** se ejecuta `loadConfig(env)`.
- **Then** se arroja un `Error` indicando que `DATABASE_URL` no cumple con el formato URI.

### Escenario 4: Incoherencia de umbrales de decisión
- **Given** un entorno con `CONFIRMED_MATCH_THRESHOLD = "0.65"` y `REVIEW_MATCH_THRESHOLD = "0.75"`.
- **When** se ejecuta `loadConfig(env)`.
- **Then** Zod rechaza la configuración indicando que el umbral de confirmación debe ser estrictamente mayor al de revisión.
