# Especificación Técnica: Servicio de Inferencia Determinista con Jev (Sistema 1)

**Identificador:** `SPEC-AI-005`  
**Archivo de Destino:** `specs/05-jev-matcher-service.spec.md`  
**Módulos Relacionados:** `src/jev-matcher.service.ts`, `src/types.ts`  
**Requerimientos SRS:** `RF-03`, `RNF-02`, `RNF-03`  
**Estado:** `Aprobado`  

---

## 1. Propósito y Alcance

Esta especificación detalla el cliente de inferencia de **Sistema 1** utilizando el modelo `typesafe-ai/jev` a través de la función `experimental_evaluate` del Vercel AI SDK (`ai`).

Objetivos arquitectónicos:
1. **Juicio Determinista y Rápido:** A diferencia de LLMs conversacionales lentos (Sistema 2), Jev actúa como un evaluador formal de estado; consume un objeto estructurado plano (`state`) y responde a preguntas tipadas primitivas (`boolean`, `number`, `string`).
2. **Inviolabilidad de Tipos (RNF-02):** La respuesta devuelta por el modelo se valida contra el esquema `ProductMatchResultSchema` (Zod) antes de propagarse al dominio, asegurando cero fallos de parseo sintáctico en tiempo de ejecución.
3. **Resiliencia ante Rate Limits y Caídas de Red (RNF-03):** Manejo automático de códigos HTTP 429 (*Too Many Requests*) y 503 (*Service Unavailable*) mediante retroceso exponencial con aleatoriedad (*jitter*).

---

## 2. Definición del Contrato (`IAiMatcherService`)

Importado exclusivamente desde `src/types.ts`:

```typescript
import {
  ClientProduct,
  ProductMatchResult,
  SupplierCandidate
} from "./types";

export interface IAiMatcherService {
  /**
   * Evalúa la equivalencia física y comercial entre un producto cliente y un candidato proveedor.
   *
   * @param clientProduct - Producto cliente con SKU y nombre.
   * @param candidate - Candidato proveedor filtrado previamente por pg_trgm.
   * @returns Resultado tipado y validado de la inferencia.
   */
  evaluateMatch(
    clientProduct: ClientProduct,
    candidate: SupplierCandidate
  ): Promise<ProductMatchResult>;
}
```

---

## 3. Esquema Zod de Validación Post-Inferencia

Ubicado en `src/types.ts` (SSOT):

```typescript
import { z } from "zod";

export const ProductMatchResultSchema = z.object({
  isMatch: z
    .boolean()
    .describe("Indica si ambos registros corresponden al mismo producto comercial."),
  confidenceScore: z
    .number()
    .min(0.0)
    .max(1.0)
    .describe("Nivel de certeza de la inferencia, normalizado de 0.0 a 1.0."),
  matchType: z
    .enum(["EXACT_CODE", "EQUIVALENT_VARIANT", "DIFFERENT_PRODUCT"]),
  discrepancyReason: z
    .enum([
      "NONE",
      "PACKAGING_DIFFERENCE",
      "SPECIFICATION_MISMATCH",
      "BRAND_MISMATCH",
      "VARIANT_MISMATCH",
      "NO_CANDIDATES_FOUND"
    ])
    .describe("Causal de la discrepancia identificada.")
});

export type ProductMatchResult = z.infer<typeof ProductMatchResultSchema>;
```

---

## 4. Algoritmo de Reintentos Exponenciales y Resiliencia

Ante fallos de invocación por límites de tasa o intermitencias en Vercel AI Gateway:

$$\text{Delay}(\text{attempt}) = \text{initialDelayMs} \times 2^{\text{attempt}} + \text{uniform}(0, 100)\text{ ms}$$

### Parámetros Operativos Inyectables:
- `modelId`: Identificador del modelo (ej. `"typesafe-ai/jev"`).
- `maxRetries`: Límite máximo de intentos (por defecto `3`).
- `initialDelayMs`: Pausa inicial en milisegundos (por defecto `400`).

---

## 5. Implementación de Referencia (`JevSystemOneMatcher`)

```typescript
import { experimental_evaluate as evaluate } from "ai";
import {
  ClientProduct,
  ProductMatchResult,
  ProductMatchResultSchema,
  SupplierCandidate
} from "./types";
import { IAiMatcherService } from "./types"; // o exportada en el módulo

export class JevSystemOneMatcher implements IAiMatcherService {
  constructor(
    private readonly modelId: string,
    private readonly maxRetries: number = 3,
    private readonly initialDelayMs: number = 400
  ) {}

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
              instructions:
                "Determina si ambos registros corresponden al mismo producto fisico y comercial exacto."
            },
            confidenceScore: {
              type: "number",
              instructions:
                "Nivel de certeza de la inferencia, escala normalizada 0.0 a 1.0."
            },
            matchType: {
              type: "string",
              instructions:
                "Clasifica: EXACT_CODE, EQUIVALENT_VARIANT o DIFFERENT_PRODUCT."
            },
            discrepancyReason: {
              type: "string",
              instructions:
                "Clasifica discrepancia: NONE, PACKAGING_DIFFERENCE, SPECIFICATION_MISMATCH, BRAND_MISMATCH o VARIANT_MISMATCH."
            }
          }
        });

        // Validación estricta en el boundary (Zero Unhandled Schema Drift)
        const validation = ProductMatchResultSchema.safeParse(rawEvaluation);
        if (!validation.success) {
          throw new Error(
            `Contrato de tipos violado por la salida del evaluador: ${validation.error.message}`
          );
        }

        return validation.data;
      } catch (error) {
        attempt++;
        if (attempt >= this.maxRetries) {
          throw new Error(
            `Fallo de inferencia Jev tras ${this.maxRetries} intentos: ${(error as Error).message}`
          );
        }
        const delay =
          this.initialDelayMs * Math.pow(2, attempt) + Math.random() * 100;
        await new Promise((res) => setTimeout(res, delay));
      }
    }

    throw new Error("Estado inalcanzable en evaluador Jev.");
  }
}
```

---

## 6. Criterios de Aceptación (BDD / Given-When-Then)

### Escenario 1: Inferencia exitosa con mapeo exacto
- **Given** un producto cliente `"Tornillo Hex 1/2"` y un candidato `"Tornillo Hexagonal 1/2 in"`.
- **When** `evaluateMatch` es ejecutado y el modelo Jev retorna `{ isMatch: true, confidenceScore: 0.95, matchType: "EQUIVALENT_VARIANT", discrepancyReason: "NONE" }`.
- **Then** el resultado es validado exitosamente por `ProductMatchResultSchema` y devuelto como un objeto fuertemente tipado.

### Escenario 2: Intercepción de respuesta malformada (Type Safety)
- **Given** una respuesta anómala del Gateway donde `confidenceScore` es `"muy alto"` (cadena en vez de número) o está fuera del rango `[0.0, 1.0]`.
- **When** se evalúa la respuesta en el boundary con `ProductMatchResultSchema.safeParse`.
- **Then** la validación falla y el servicio lanza un `Error` descriptivo de violación de contrato impidiendo que datos corruptos alcancen la base de datos.

### Escenario 3: Recuperación tras errores transitorios HTTP 429
- **Given** una invocación que recibe un error `429 Too Many Requests` en los dos primeros intentos.
- **When** el servicio reintenta con retroceso exponencial y el tercer intento retorna una evaluación válida.
- **Then** el servicio completa la llamada con éxito sin propagar la excepción al orquestador.
