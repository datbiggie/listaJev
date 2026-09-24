import {
  ClientProduct,
  IAiMatcherService,
  ProductMatchResult,
  ProductMatchResultSchema,
  SupplierCandidate
} from "./types";

interface JevEvaluateResponse {
  model?: string;
  answers?: {
    isMatch?: {
      type: "boolean";
      probability: number;
    };
    matchType?: {
      type: "choice";
      choice: "EXACT_CODE" | "EQUIVALENT_VARIANT" | "DIFFERENT_PRODUCT";
      probabilities?: Record<string, number>;
      confidence?: number;
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
    };
  };
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  [key: string]: unknown;
}

function parseJevResponse(rawJson: unknown): ProductMatchResult {
  const data = rawJson as JevEvaluateResponse;

  if (data.answers) {
    const answers = data.answers;
    const matchChoice = answers.matchType?.choice;
    const isDifferent = matchChoice === "DIFFERENT_PRODUCT";
    const matchProbability = answers.isMatch?.probability ?? 0;
    const discrepancy = answers.discrepancyReason?.choice;

    const isMatch =
      !isDifferent &&
      discrepancy !== "BRAND_MISMATCH" &&
      matchProbability >= 0.5;

    let confidenceScore = matchProbability;
    if (matchChoice === "EXACT_CODE") {
      confidenceScore = Math.max(
        matchProbability,
        answers.matchType?.probabilities?.["EXACT_CODE"] ?? 0.95
      );
    } else if (matchChoice === "EQUIVALENT_VARIANT") {
      confidenceScore = Math.max(
        matchProbability,
        answers.matchType?.probabilities?.["EQUIVALENT_VARIANT"] ?? 0.75
      );
    } else if (isDifferent) {
      confidenceScore = Math.min(
        matchProbability,
        answers.matchType?.probabilities?.["DIFFERENT_PRODUCT"]
          ? 1 - answers.matchType.probabilities["DIFFERENT_PRODUCT"]
          : 0.2
      );
    }

    const normalizedConfidence = Math.max(
      0.0,
      Math.min(1.0, Math.round(confidenceScore * 100) / 100)
    );

    const matchType =
      matchChoice ?? (isMatch ? "EQUIVALENT_VARIANT" : "DIFFERENT_PRODUCT");
    const discrepancyReason =
      discrepancy ?? (isMatch ? "NONE" : "SPECIFICATION_MISMATCH");

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
 * Cliente de inferencia determinista de Sistema 1 utilizando typesafe-ai/jev vía Vercel AI Gateway Evaluation API.
 */
export class JevSystemOneMatcher implements IAiMatcherService {
  constructor(
    public readonly modelId: string = "typesafe-ai/jev",
    private readonly maxRetries: number = 3,
    private readonly initialDelayMs: number = 400,
    private readonly apiKey?: string,
    private readonly baseUrl: string = "https://ai-gateway.vercel.sh/v1"
  ) {
    if (!modelId || modelId.trim().length === 0) {
      throw new Error("modelId es obligatorio para inicializar JevSystemOneMatcher");
    }
  }

  public async evaluateMatch(
    clientProduct: ClientProduct,
    candidate: SupplierCandidate
  ): Promise<ProductMatchResult> {
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      throw new Error("Clave de API no configurada para el servicio de inferencia");
    }

    const cleanBaseUrl = this.baseUrl.replace(/\/+$/, "");
    const endpoint = cleanBaseUrl.endsWith("/evaluate")
      ? cleanBaseUrl
      : `${cleanBaseUrl}/evaluate`;

    const statePayload = JSON.stringify({
      clientProduct: {
        sku: clientProduct.sku,
        name: clientProduct.name,
        brand: clientProduct.brand ?? "NO_ESPECIFICADA"
      },
      supplierCandidate: {
        sku: candidate.sku,
        name: candidate.name,
        brand: candidate.brand ?? "NO_ESPECIFICADA",
        lexicalSimilarityScore: candidate.similarityScore
      }
    });

    const payload = {
      model: this.modelId,
      state: statePayload,
      questions: {
        isMatch: {
          type: "boolean",
          instructions:
            "Determina si ambos registros corresponden al mismo producto comercial, ya sea de forma idéntica o como variante equivalente comercialmente compatible."
        },
        matchType: {
          type: "choice",
          criteria: {
            EXACT_CODE: "Mismo producto con código o SKU idéntico",
            EQUIVALENT_VARIANT: "Mismo producto físico pero variante equivalente o diferente presentación",
            DIFFERENT_PRODUCT: "Producto completamente distinto o marcas incompatibles"
          }
        },
        discrepancyReason: {
          type: "choice",
          criteria: {
            NONE: "Sin discrepancias significativas",
            PACKAGING_DIFFERENCE: "Diferencia en presentación, cantidad o empaque",
            SPECIFICATION_MISMATCH: "Discrepancia en especificaciones técnicas",
            BRAND_MISMATCH: "Discrepancia de marcas comerciales incompatibles",
            VARIANT_MISMATCH: "Discrepancia de variantes o modelo"
          }
        }
      }
    };

    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (response.status === 401 || response.status === 403) {
          const errorBody = await response.text();
          throw new Error(
            `Fallo de autenticacion o saldo en AI Gateway (HTTP ${response.status}): ${errorBody}`
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
              `Fallo de inferencia Jev tras ${this.maxRetries} intentos: HTTP 429 en AI Gateway: ${errorBody}`
            );
          }

          await new Promise((res) => setTimeout(res, Math.min(waitMs, 60000)));
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status} en AI Gateway: ${errorText}`);
        }

        const rawJson = await response.json();
        const result = parseJevResponse(rawJson);
        const validation = ProductMatchResultSchema.safeParse(result);

        if (!validation.success) {
          throw new Error(
            `Contrato de tipos violado por la salida del evaluador: ${validation.error.message}`
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
            `Fallo de inferencia Jev tras ${this.maxRetries} intentos: ${message}`
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
