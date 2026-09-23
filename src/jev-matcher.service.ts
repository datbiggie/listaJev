import {
  ClientProduct,
  IAiMatcherService,
  ProductMatchResult,
  ProductMatchResultSchema,
  SupplierCandidate
} from "./types";

/**
 * Cliente de inferencia semántica (Sistema 1) compatible con Vercel AI Gateway / OpenAI API.
 */
export class JevSystemOneMatcher implements IAiMatcherService {
  private readonly effectiveModel: string;

  constructor(
    public readonly modelId: string,
    private readonly maxRetries: number = 3,
    private readonly initialDelayMs: number = 400,
    private readonly apiKey?: string,
    private readonly baseUrl: string = "https://ai-gateway.vercel.sh/v1"
  ) {
    if (!modelId || modelId.trim().length === 0) {
      throw new Error("modelId es obligatorio para inicializar JevSystemOneMatcher");
    }
    // Mapeo seguro de alias en caso de que modelId no tenga prefijo de proveedor en AI Gateway
    this.effectiveModel =
      modelId === "typesafe-ai/jev" ? "openai/gpt-4o-mini" : modelId;
  }

  public async evaluateMatch(
    clientProduct: ClientProduct,
    candidate: SupplierCandidate
  ): Promise<ProductMatchResult> {
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      throw new Error("Clave de API no configurada para el servicio de inferencia");
    }

    const payload = {
      model: this.effectiveModel,
      messages: [
        {
          role: "system",
          content:
            "Eres un evaluador formal de equivalencias de catálogo de productos comerciales. " +
            "Determina si ambos registros corresponden al mismo producto físico y comercial exacto. " +
            "Responde estrictamente con un JSON válido conteniendo: " +
            "isMatch (boolean), confidenceScore (number entre 0.0 y 1.0), " +
            "matchType ('EXACT_CODE' | 'EQUIVALENT_VARIANT' | 'DIFFERENT_PRODUCT'), " +
            "y discrepancyReason ('NONE' | 'PACKAGING_DIFFERENCE' | 'SPECIFICATION_MISMATCH' | 'BRAND_MISMATCH' | 'VARIANT_MISMATCH' | 'NO_CANDIDATES_FOUND')."
        },
        {
          role: "user",
          content: JSON.stringify({
            clientProduct: {
              sku: clientProduct.sku,
              name: clientProduct.name
            },
            supplierCandidate: {
              sku: candidate.sku,
              name: candidate.name,
              lexicalSimilarityScore: candidate.similarityScore
            }
          })
        }
      ],
      response_format: { type: "json_object" }
    };

    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        // Fail-Fast: Rechazos de autorización o saldo no son recuperables con reintentos
        if (response.status === 401 || response.status === 403) {
          const errorBody = await response.text();
          throw new Error(
            `Fallo de autenticacion o saldo en AI Gateway (HTTP ${response.status}): ${errorBody}`
          );
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status} en AI Gateway: ${errorText}`);
        }

        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };

        const rawContent = data.choices?.[0]?.message?.content;
        if (!rawContent) {
          throw new Error("Respuesta vacia recibida desde AI Gateway");
        }

        const parsedJson = JSON.parse(rawContent);
        const validation = ProductMatchResultSchema.safeParse(parsedJson);

        if (!validation.success) {
          throw new Error(
            `Contrato de tipos violado por la salida del evaluador: ${validation.error.message}`
          );
        }

        return validation.data;
      } catch (error) {
        const message = (error as Error).message;

        // Errores irrecuperables de autenticación/verificación deben fallar inmediatamente
        if (message.includes("Fallo de autenticacion o saldo") || message.includes("401") || message.includes("403")) {
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
