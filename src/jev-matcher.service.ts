import * as aiModule from "ai";
import {
  ClientProduct,
  IAiMatcherService,
  ProductMatchResult,
  ProductMatchResultSchema,
  SupplierCandidate
} from "./types";

const evaluate = ((aiModule as Record<string, any>)["experimental_evaluate"] ??
  (async () => ({}))) as (options: any) => Promise<Record<string, unknown>>;

/**
 * Cliente de inferencia determinista de Sistema 1 utilizando typesafe-ai/jev vía Vercel AI SDK.
 */
export class JevSystemOneMatcher implements IAiMatcherService {
  constructor(
    private readonly modelId: string,
    private readonly maxRetries: number = 3,
    private readonly initialDelayMs: number = 400
  ) {
    if (!modelId) {
      throw new Error("modelId es obligatorio para inicializar JevSystemOneMatcher");
    }
  }

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
