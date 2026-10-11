import {
  ClientProduct,
  IAiMatcherService,
  ProductMatchResult,
  ProductMatchResultSchema,
  SupplierCandidate
} from "./types";
import {
  brandsAreCompatible,
  extractSkuRoot,
  hasVariantConflict,
  sanitizeBrand
} from "./sku-normalizer";

export interface LayaEvaluateResponse {
  model?: string;
  answers?: {
    isMatch?: {
      type: "noul" | "boolean";
      noul?: number;
      probability?: number;
      confidence?: number;
      action?: { act_probability: number };
    };
    matchType?: {
      type: "choice";
      choice: "EXACT_CODE" | "EQUIVALENT_VARIANT" | "DIFFERENT_PRODUCT";
      probabilities?: Record<string, number>;
      confidence?: number;
      action?: { act_probability: number };
    };
    discrepancyReason?: {
      type: "choice";
      choice:
        | "NONE"
        | "PACKAGING_DIFFERENCE"
        | "SPECIFICATION_MISMATCH"
        | "BRAND_MISMATCH"
        | "VARIANT_MISMATCH"
        | "NO_CANDIDATES_FOUND";
      probabilities?: Record<string, number>;
      confidence?: number;
      action?: { act_probability: number };
    };
    [key: string]: unknown;
  };
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  [key: string]: unknown;
}

/**
 * Construye el payload estructurado tridimensional (Código/SKU, Marca, Descripción)
 * y las preguntas tipadas optimizadas para inferencia en Laya (convaiinnovations/laya).
 */
export function buildLayaMatchPayload(
  clientProduct: ClientProduct,
  candidate: SupplierCandidate,
  modelId: string
) {
  const clientBrandClean = sanitizeBrand(clientProduct.brand);
  const supplierBrandClean = sanitizeBrand(candidate.brand);

  const clientRoot = extractSkuRoot(clientProduct.sku);
  const supplierRoot = extractSkuRoot(candidate.sku);

  let brandRelation:
    | "IDENTICAL"
    | "KNOWN_ALIAS"
    | "NEUTRAL_OR_UNSPECIFIED"
    | "CONFLICTING_BRANDS";

  if (!clientBrandClean || !supplierBrandClean) {
    brandRelation = "NEUTRAL_OR_UNSPECIFIED";
  } else if (!brandsAreCompatible(clientBrandClean, supplierBrandClean)) {
    brandRelation = "CONFLICTING_BRANDS";
  } else if (clientBrandClean === supplierBrandClean) {
    brandRelation = "IDENTICAL";
  } else {
    brandRelation = "KNOWN_ALIAS";
  }

  const isExactCode =
    Boolean(clientProduct.normalizedSku) &&
    Boolean(candidate.normalizedSku) &&
    clientProduct.normalizedSku === candidate.normalizedSku;

  const sharesRootCode =
    clientRoot.rootSku.length >= 3 && clientRoot.rootSku === supplierRoot.rootSku;

  const specConflict = hasVariantConflict(
    clientProduct.sku,
    clientProduct.name,
    candidate.sku,
    candidate.name
  );

  const statePayload = {
    // Compatibilidad retroactiva directa para observabilidad
    clientProduct: {
      sku: clientProduct.sku,
      name: clientProduct.name,
      brand: clientBrandClean ?? "NO_ESPECIFICADA"
    },
    supplierCandidate: {
      sku: candidate.sku,
      name: candidate.name,
      brand: supplierBrandClean ?? "NO_ESPECIFICADA",
      lexicalSimilarityScore: candidate.similarityScore
    },
    // Dimensiones explícitas para máxima atención cruzada de Laya
    codeComparison: {
      clientSku: clientProduct.sku,
      clientNormalizedSku: clientProduct.normalizedSku,
      supplierSku: candidate.sku,
      supplierNormalizedSku: candidate.normalizedSku,
      isExactCode,
      sharesRootCode
    },
    brandComparison: {
      clientBrand: clientBrandClean ?? "NO_ESPECIFICADA",
      supplierBrand: supplierBrandClean ?? "NO_ESPECIFICADA",
      brandCompatibility: brandRelation
    },
    descriptionComparison: {
      clientDescription: clientProduct.name,
      supplierDescription: candidate.name,
      lexicalSimilarityPercentage: Math.round(candidate.similarityScore * 100),
      hasSpecificationConflict: specConflict
    }
  };

  return {
    model: modelId,
    state: statePayload,
    questions: {
      isMatch: {
        type: "noul" as const,
        instructions:
          "Determina si ambos registros corresponden al mismo producto comercial, considerando rigurosamente: 1) código o raíz de SKU, 2) compatibilidad de marcas (descarta marcas rivales o en conflicto), y 3) especificaciones técnicas en la descripción (descarta discrepancias de voltaje, amperaje o medidas)."
      },
      matchType: {
        type: "choice" as const,
        instructions: "Clasifica el grado de equivalencia comercial entre ambos productos.",
        criteria: {
          EXACT_CODE: "Mismo producto con código idéntico o raíz equivalente, y marca plenamente compatible",
          EQUIVALENT_VARIANT: "Mismo producto físico pero variante equivalente de empaque o presentación compatible",
          DIFFERENT_PRODUCT: "Producto completamente distinto, marcas incompatibles o especificaciones técnicas en conflicto"
        }
      },
      discrepancyReason: {
        type: "choice" as const,
        instructions: "Indica la causal formal de discrepancia entre los registros.",
        criteria: {
          NONE: "Sin discrepancias significativas; código, marca y descripción compatibles",
          PACKAGING_DIFFERENCE: "Diferencia únicamente en presentación, cantidad o empaque",
          SPECIFICATION_MISMATCH: "Discrepancia en especificaciones técnicas críticas en la descripción (voltaje, amperios, medidas)",
          BRAND_MISMATCH: "Discrepancia de marcas comerciales distintas e incompatibles",
          VARIANT_MISMATCH: "Discrepancia en modelo, año, lado o variante del repuesto"
        }
      }
    }
  };
}

/**
 * Parsea y normaliza la respuesta generada por Laya (convaiinnovations/laya)
 * adaptando tanto su estructura nativa basada en noul/choice como respuestas normalizadas.
 */
export function parseLayaResponse(rawJson: unknown): ProductMatchResult {
  const data = rawJson as LayaEvaluateResponse;

  if (data.answers) {
    const answers = data.answers;
    const matchChoice = answers.matchType?.choice;
    const isDifferent = matchChoice === "DIFFERENT_PRODUCT";
    // En Laya, el tipo noul entrega la probabilidad en data.answers.isMatch.noul
    const matchProbability =
      answers.isMatch?.noul ?? answers.isMatch?.probability ?? 0;
    const discrepancy = answers.discrepancyReason?.choice;

    // Regla estricta 1: Conflicto de marca invalida el match de inmediato
    const isBrandMismatch = discrepancy === "BRAND_MISMATCH";

    // Regla estricta 2: Conflicto en especificaciones técnicas críticas
    const isSpecMismatch = discrepancy === "SPECIFICATION_MISMATCH";

    const isMatch =
      !isDifferent &&
      !isBrandMismatch &&
      !isSpecMismatch &&
      matchProbability >= 0.5;

    let confidenceScore = matchProbability;

    if (isBrandMismatch) {
      confidenceScore = Math.min(
        matchProbability,
        answers.matchType?.probabilities?.["DIFFERENT_PRODUCT"]
          ? 1 - answers.matchType.probabilities["DIFFERENT_PRODUCT"]
          : 0.15
      );
    } else if (isSpecMismatch) {
      confidenceScore = Math.min(
        matchProbability,
        answers.matchType?.probabilities?.["DIFFERENT_PRODUCT"]
          ? 1 - answers.matchType.probabilities["DIFFERENT_PRODUCT"]
          : 0.25
      );
    } else if (matchChoice === "EXACT_CODE") {
      const exactProb = answers.matchType?.probabilities?.["EXACT_CODE"] ?? 0.95;
      confidenceScore = Math.max(matchProbability, exactProb);
    } else if (matchChoice === "EQUIVALENT_VARIANT") {
      const equivProb = answers.matchType?.probabilities?.["EQUIVALENT_VARIANT"] ?? 0.75;
      confidenceScore = Math.min(0.89, Math.max(0.70, (matchProbability + equivProb) / 2));
    } else if (isDifferent) {
      const diffProb = answers.matchType?.probabilities?.["DIFFERENT_PRODUCT"] ?? 0.85;
      confidenceScore = Math.min(matchProbability, 1 - diffProb);
    }

    const normalizedConfidence = Math.max(
      0.0,
      Math.min(1.0, Math.round(confidenceScore * 100) / 100)
    );

    const matchType =
      matchChoice ?? (isMatch ? "EQUIVALENT_VARIANT" : "DIFFERENT_PRODUCT");

    const discrepancyReason =
      discrepancy ??
      (isMatch
        ? "NONE"
        : isBrandMismatch
          ? "BRAND_MISMATCH"
          : isSpecMismatch
            ? "SPECIFICATION_MISMATCH"
            : "SPECIFICATION_MISMATCH");

    return ProductMatchResultSchema.parse({
      isMatch,
      confidenceScore: normalizedConfidence,
      matchType,
      discrepancyReason
    });
  }

  if (data.choices?.[0]?.message?.content) {
    const parsed = JSON.parse(data.choices[0].message.content);
    return ProductMatchResultSchema.parse(parsed);
  }

  return ProductMatchResultSchema.parse(data);
}

/**
 * Cliente de inferencia determinista de Sistema 1 utilizando los pesos de Laya (convaiinnovations/laya).
 * Conecta con el servidor de inferencia Laya (FastAPI o Gateway) evaluando preguntas tipadas noul y choice.
 */
export class LayaSystemOneMatcher implements IAiMatcherService {
  constructor(
    public readonly modelId: string = "convaiinnovations/laya",
    private readonly maxRetries: number = 3,
    private readonly initialDelayMs: number = 400,
    private readonly apiKey?: string,
    private readonly baseUrl: string = "http://localhost:8000"
  ) {
    if (!modelId || modelId.trim().length === 0) {
      throw new Error("modelId es obligatorio para inicializar LayaSystemOneMatcher");
    }
  }

  private isLocalEndpoint(url: string): boolean {
    return (
      url.includes("localhost") ||
      url.includes("127.0.0.1") ||
      url.includes("::1") ||
      url.includes("backend") ||
      url.includes("0.0.0.0")
    );
  }

  public async evaluateMatch(
    clientProduct: ClientProduct,
    candidate: SupplierCandidate
  ): Promise<ProductMatchResult> {
    const isLocal = this.isLocalEndpoint(this.baseUrl);

    if (!isLocal && (!this.apiKey || this.apiKey.trim().length === 0)) {
      throw new Error("Clave de API no configurada para el servicio de inferencia remoto");
    }

    const cleanBaseUrl = this.baseUrl.replace(/\/+$/, "");
    const endpoint = cleanBaseUrl.endsWith("/evaluate")
      ? cleanBaseUrl
      : `${cleanBaseUrl}/evaluate`;

    const payload = buildLayaMatchPayload(clientProduct, candidate, this.modelId);

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (this.apiKey && this.apiKey.trim().length > 0) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });

        if (response.status === 401 || response.status === 403) {
          const errorBody = await response.text();
          throw new Error(
            `Fallo de autenticacion o saldo en servicio Laya (HTTP ${response.status}): ${errorBody}`
          );
        }

        if (response.status === 429) {
          const retryAfterHeader = response.headers.get("retry-after");
          const errorBody = await response.text();
          let waitMs = 0;

          if (retryAfterHeader) {
            const parsedSeconds = parseInt(retryAfterHeader, 10);
            if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
              waitMs = parsedSeconds * 1000;
            }
          }

          if (waitMs === 0) {
            const match = /Retry after (\d+)s/i.exec(errorBody);
            if (match && match[1]) {
              waitMs = parseInt(match[1], 10) * 1000;
            }
          }

          if (waitMs === 0) {
            waitMs =
              this.initialDelayMs * Math.pow(2, attempt) + Math.random() * 100;
          }

          attempt++;
          if (attempt >= this.maxRetries) {
            throw new Error(
              `Fallo de inferencia Laya tras ${this.maxRetries} intentos: HTTP 429 en servicio de inferencia: ${errorBody}`
            );
          }

          await new Promise((res) => setTimeout(res, Math.min(waitMs, 60000)));
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status} en servicio Laya: ${errorText}`);
        }

        const rawJson = await response.json();
        const result = parseLayaResponse(rawJson);
        const validation = ProductMatchResultSchema.safeParse(result);

        if (!validation.success) {
          throw new Error(
            `Contrato de tipos violado por la salida de Laya: ${validation.error.message}`
          );
        }

        return validation.data;
      } catch (error) {
        const message = (error as Error).message;

        if (
          message.includes("Fallo de autenticacion o saldo") ||
          message.includes("401") ||
          message.includes("403")
        ) {
          throw error;
        }

        attempt++;
        if (attempt >= this.maxRetries) {
          throw new Error(
            `Fallo de inferencia Laya tras ${this.maxRetries} intentos: ${message}`
          );
        }

        const delay =
          this.initialDelayMs * Math.pow(2, attempt) + Math.random() * 100;
        await new Promise((res) => setTimeout(res, delay));
      }
    }

    throw new Error("Estado inalcanzable en evaluador Laya.");
  }

  /**
   * Evalúa un lote de pares producto-candidato de forma concurrente y resiliente.
   */
  public async evaluateBatch(
    items: Array<{ clientProduct: ClientProduct; candidate: SupplierCandidate }>
  ): Promise<ProductMatchResult[]> {
    if (items.length === 0) {
      return [];
    }
    return Promise.all(
      items.map((item) => this.evaluateMatch(item.clientProduct, item.candidate))
    );
  }
}
