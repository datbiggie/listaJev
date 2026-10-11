import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LayaSystemOneMatcher } from "../../src/laya-matcher.service.js";
import { ClientProduct, SupplierCandidate } from "../../src/types.js";

describe("SPEC-AI-006: Servicio LayaSystemOneMatcher", () => {
  const clientProduct: ClientProduct = {
    id: "cli-1",
    sku: "CLI-HEX-100",
    normalizedSku: "CLIHEX100",
    name: "Tornillo Hexagonal 1/2 pulgada"
  };

  const candidate: SupplierCandidate = {
    sku: "SUP-HEX-050",
    normalizedSku: "SUPHEX050",
    name: "Tornillo Hex 1/2 in",
    similarityScore: 0.85
  };

  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("TC-LAYA-01: realiza inferencia exitosa con salida nativa de Laya (noul y choice) y valida con Zod", async () => {
    const mockLayaResponse = {
      model: "laya-rl-agent",
      answers: {
        isMatch: {
          type: "noul",
          noul: 0.996,
          confidence: 0.996,
          action: { act_probability: 1.0 }
        },
        matchType: {
          type: "choice",
          choice: "EXACT_CODE",
          probabilities: {
            EXACT_CODE: 0.98,
            EQUIVALENT_VARIANT: 0.02,
            DIFFERENT_PRODUCT: 0.0
          },
          confidence: 0.98,
          action: { act_probability: 1.0 }
        },
        discrepancyReason: {
          type: "choice",
          choice: "NONE",
          probabilities: {
            NONE: 0.99
          },
          confidence: 0.99,
          action: { act_probability: 1.0 }
        }
      },
      usage: {
        input_tokens: 361,
        output_tokens: 0
      }
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockLayaResponse
    });

    const matcher = new LayaSystemOneMatcher(
      "convaiinnovations/laya",
      3,
      10,
      undefined,
      "http://localhost:8000"
    );
    const result = await matcher.evaluateMatch(clientProduct, candidate);

    expect(result.isMatch).toBe(true);
    expect(result.matchType).toBe("EXACT_CODE");
    expect(result.discrepancyReason).toBe("NONE");
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.95);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("TC-LAYA-02: envía type 'noul' para isMatch y estructura correctamente las preguntas", async () => {
    const mockLayaResponse = {
      model: "laya-rl-agent",
      answers: {
        isMatch: { type: "noul", noul: 0.92, confidence: 0.92 },
        matchType: { type: "choice", choice: "EQUIVALENT_VARIANT" },
        discrepancyReason: { type: "choice", choice: "NONE" }
      }
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockLayaResponse
    });

    const matcher = new LayaSystemOneMatcher(
      "convaiinnovations/laya",
      3,
      10,
      undefined,
      "http://localhost:8000"
    );
    await matcher.evaluateMatch(clientProduct, candidate);

    const callArgs = (vi.mocked(global.fetch).mock.calls[0]![1] as any);
    const payload = JSON.parse(callArgs.body);

    expect(payload.questions.isMatch.type).toBe("noul");
    expect(payload.questions.matchType.type).toBe("choice");
    expect(payload.questions.discrepancyReason.type).toBe("choice");
    expect(payload.state.clientProduct.sku).toBe("CLI-HEX-100");
    expect(payload.state.supplierCandidate.sku).toBe("SUP-HEX-050");
  });

  it("TC-LAYA-03: intercepta respuestas del modelo que violan el contrato de esquema Zod", async () => {
    const invalidOutput = {
      isMatch: true,
      confidenceScore: 2.5, // Fuera del rango [0.0, 1.0]
      matchType: "INVALID_TYPE",
      discrepancyReason: "NONE"
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(invalidOutput) } }]
      })
    });

    const matcher = new LayaSystemOneMatcher(
      "convaiinnovations/laya",
      2,
      5,
      undefined,
      "http://localhost:8000"
    );

    await expect(matcher.evaluateMatch(clientProduct, candidate)).rejects.toThrow(
      /Fallo de inferencia Laya tras 2 intentos/
    );
  });

  it("TC-LAYA-04: reintenta ante errores transitorios (HTTP 429, 503) y resuelve con éxito", async () => {
    const validOutput = {
      model: "laya-rl-agent",
      answers: {
        isMatch: { type: "noul", noul: 0.88, confidence: 0.88 },
        matchType: { type: "choice", choice: "EXACT_CODE" },
        discrepancyReason: { type: "choice", choice: "NONE" }
      }
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ "retry-after": "1" }),
        text: async () => "HTTP 429 Too Many Requests"
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => "HTTP 503 Service Unavailable"
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validOutput
      });

    const matcher = new LayaSystemOneMatcher(
      "convaiinnovations/laya",
      3,
      5,
      undefined,
      "http://localhost:8000"
    );
    const result = await matcher.evaluateMatch(clientProduct, candidate);

    expect(result.isMatch).toBe(true);
    expect(result.matchType).toBe("EXACT_CODE");
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("TC-LAYA-05: agota reintentos y lanza excepción descriptiva", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "HTTP 500 Internal Inference Error"
    });

    const matcher = new LayaSystemOneMatcher(
      "convaiinnovations/laya",
      3,
      5,
      undefined,
      "http://localhost:8000"
    );

    await expect(matcher.evaluateMatch(clientProduct, candidate)).rejects.toThrow(
      /Fallo de inferencia Laya tras 3 intentos/
    );
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("TC-LAYA-06: falla inmediatamente sin reintentos ante error 401 o 403", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => "unauthorized_token"
    });

    const matcher = new LayaSystemOneMatcher(
      "convaiinnovations/laya",
      3,
      5,
      "test-token",
      "https://remote-laya.api/v1"
    );

    await expect(matcher.evaluateMatch(clientProduct, candidate)).rejects.toThrow(
      /Fallo de autenticacion o saldo en servicio Laya \(HTTP 403\)/
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("TC-LAYA-07: lanza error si modelId está vacío", () => {
    expect(() => new LayaSystemOneMatcher("")).toThrow(
      "modelId es obligatorio para inicializar LayaSystemOneMatcher"
    );
  });

  it("TC-LAYA-08: requiere API key si se conecta a un endpoint remoto", async () => {
    const matcher = new LayaSystemOneMatcher(
      "convaiinnovations/laya",
      3,
      5,
      "",
      "https://remote-gateway.example.com"
    );
    await expect(matcher.evaluateMatch(clientProduct, candidate)).rejects.toThrow(
      "Clave de API no configurada para el servicio de inferencia remoto"
    );
  });

  it("TC-LAYA-09: clasifica correctamente DIFFERENT_PRODUCT cuando matchChoice indica incompatibilidad", async () => {
    const differentProductResponse = {
      model: "laya-rl-agent",
      answers: {
        isMatch: { type: "noul", noul: 0.15, confidence: 0.85 },
        matchType: {
          type: "choice",
          choice: "DIFFERENT_PRODUCT",
          probabilities: {
            EXACT_CODE: 0.05,
            EQUIVALENT_VARIANT: 0.1,
            DIFFERENT_PRODUCT: 0.85
          }
        },
        discrepancyReason: {
          type: "choice",
          choice: "BRAND_MISMATCH"
        }
      }
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => differentProductResponse
    });

    const matcher = new LayaSystemOneMatcher(
      "convaiinnovations/laya",
      3,
      10,
      undefined,
      "http://localhost:8000"
    );
    const result = await matcher.evaluateMatch(clientProduct, candidate);

    expect(result.isMatch).toBe(false);
    expect(result.matchType).toBe("DIFFERENT_PRODUCT");
    expect(result.discrepancyReason).toBe("BRAND_MISMATCH");
    expect(result.confidenceScore).toBeLessThanOrEqual(0.2);
  });

  it("TC-LAYA-10: genera state tridimensional enriquecido con código, marca y descripción", async () => {
    const productWithBrand: ClientProduct = {
      id: "cli-2",
      sku: "8483N-3P-ENELB",
      normalizedSku: "8483N3PENELB",
      name: "ALTERNADOR AVEO 1.6L 04-08 12V 85A",
      brand: "ENELBROCK"
    };

    const candidateWithBrand: SupplierCandidate = {
      sku: "8483N-3P-ENELB",
      normalizedSku: "8483N3PENELB",
      name: "ALTERNADOR AVEO 1.6L 12V 85A 3PINE",
      brand: "ENELB",
      similarityScore: 0.92
    };

    const mockResponse = {
      model: "laya-rl-agent",
      answers: {
        isMatch: { type: "noul", noul: 0.98 },
        matchType: { type: "choice", choice: "EXACT_CODE" },
        discrepancyReason: { type: "choice", choice: "NONE" }
      }
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse
    });

    const matcher = new LayaSystemOneMatcher(
      "convaiinnovations/laya",
      3,
      10,
      undefined,
      "http://localhost:8000"
    );
    await matcher.evaluateMatch(productWithBrand, candidateWithBrand);

    const callArgs = (vi.mocked(global.fetch).mock.calls[0]![1] as any);
    const payload = JSON.parse(callArgs.body);

    expect(payload.state.codeComparison.isExactCode).toBe(true);
    expect(payload.state.brandComparison.brandCompatibility).toBe("KNOWN_ALIAS");
    expect(payload.state.descriptionComparison.hasSpecificationConflict).toBe(false);
    expect(payload.state.descriptionComparison.lexicalSimilarityPercentage).toBe(92);
  });

  it("TC-LAYA-11: detecta conflicto de marcas y asigna BRAND_MISMATCH", async () => {
    const conflictingProduct: ClientProduct = {
      id: "cli-3",
      sku: "ALT-123-BOSCH",
      normalizedSku: "ALT123BOSCH",
      name: "Alternador Bosch 12V 90A",
      brand: "BOSCH"
    };

    const candidateRival: SupplierCandidate = {
      sku: "ALT-123-VALEO",
      normalizedSku: "ALT123VALEO",
      name: "Alternador Valeo 12V 90A",
      brand: "VALEO",
      similarityScore: 0.88
    };

    const mockConflictResponse = {
      model: "laya-rl-agent",
      answers: {
        isMatch: { type: "noul", noul: 0.1 },
        matchType: {
          type: "choice",
          choice: "DIFFERENT_PRODUCT",
          probabilities: { DIFFERENT_PRODUCT: 0.95 }
        },
        discrepancyReason: { type: "choice", choice: "BRAND_MISMATCH" }
      }
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockConflictResponse
    });

    const matcher = new LayaSystemOneMatcher(
      "convaiinnovations/laya",
      3,
      10,
      undefined,
      "http://localhost:8000"
    );
    const result = await matcher.evaluateMatch(conflictingProduct, candidateRival);

    expect(result.isMatch).toBe(false);
    expect(result.matchType).toBe("DIFFERENT_PRODUCT");
    expect(result.discrepancyReason).toBe("BRAND_MISMATCH");
    expect(result.confidenceScore).toBeLessThanOrEqual(0.15);
  });

  it("TC-LAYA-12: invalida coincidencia ante discrepancia de especificaciones técnicas", async () => {
    const specResponse = {
      model: "laya-rl-agent",
      answers: {
        isMatch: { type: "noul", noul: 0.3 },
        matchType: {
          type: "choice",
          choice: "DIFFERENT_PRODUCT",
          probabilities: { DIFFERENT_PRODUCT: 0.8 }
        },
        discrepancyReason: { type: "choice", choice: "SPECIFICATION_MISMATCH" }
      }
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => specResponse
    });

    const matcher = new LayaSystemOneMatcher(
      "convaiinnovations/laya",
      3,
      10,
      undefined,
      "http://localhost:8000"
    );
    const result = await matcher.evaluateMatch(clientProduct, candidate);

    expect(result.isMatch).toBe(false);
    expect(result.discrepancyReason).toBe("SPECIFICATION_MISMATCH");
    expect(result.confidenceScore).toBeLessThanOrEqual(0.25);
  });

  it("TC-LAYA-13: evaluateBatch procesa múltiples pares concurrentemente y devuelve resultados ordenados", async () => {
    const mockBatchResponse = {
      model: "laya-rl-agent",
      answers: {
        isMatch: { type: "noul", noul: 0.96 },
        matchType: {
          type: "choice",
          choice: "EXACT_CODE",
          probabilities: { EXACT_CODE: 0.96 }
        },
        discrepancyReason: { type: "choice", choice: "NONE" }
      }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockBatchResponse
    });

    const matcher = new LayaSystemOneMatcher(
      "convaiinnovations/laya",
      3,
      10,
      undefined,
      "http://localhost:8000"
    );
    const items = [
      { clientProduct, candidate },
      { clientProduct, candidate }
    ];

    const results = await matcher.evaluateBatch(items);

    expect(results).toHaveLength(2);
    expect(results[0].isMatch).toBe(true);
    expect(results[1].isMatch).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);

    const empty = await matcher.evaluateBatch([]);
    expect(empty).toEqual([]);
  });
});

