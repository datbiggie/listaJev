import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { JevSystemOneMatcher } from "../../src/jev-matcher.service.js";
import { ClientProduct, SupplierCandidate } from "../../src/types.js";

describe("SPEC-AI-005: Servicio JevSystemOneMatcher", () => {
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

  it("TC-U-08: realiza inferencia exitosa y valida contra ProductMatchResultSchema", async () => {
    const mockOutput = {
      isMatch: true,
      confidenceScore: 0.95,
      matchType: "EQUIVALENT_VARIANT",
      discrepancyReason: "NONE"
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockOutput) } }]
      })
    });

    const matcher = new JevSystemOneMatcher("typesafe-ai/jev", 3, 10, "test-api-key");
    const result = await matcher.evaluateMatch(clientProduct, candidate);

    expect(result).toEqual(mockOutput);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("TC-U-09: intercepta respuestas del modelo que violan el contrato de esquema Zod", async () => {
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

    const matcher = new JevSystemOneMatcher("typesafe-ai/jev", 2, 5, "test-api-key");

    await expect(matcher.evaluateMatch(clientProduct, candidate)).rejects.toThrow(
      /Fallo de inferencia Jev tras 2 intentos/
    );
  });

  it("TC-U-10: reintenta ante errores transitorios y resuelve con éxito", async () => {
    const validOutput = {
      isMatch: true,
      confidenceScore: 0.85,
      matchType: "EXACT_CODE",
      discrepancyReason: "NONE"
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
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
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(validOutput) } }]
        })
      });

    const matcher = new JevSystemOneMatcher("typesafe-ai/jev", 3, 5, "test-api-key");
    const result = await matcher.evaluateMatch(clientProduct, candidate);

    expect(result).toEqual(validOutput);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("TC-U-11: agota reintentos y lanza excepción descriptiva", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "HTTP 500 Internal Gateway Error"
    });

    const matcher = new JevSystemOneMatcher("typesafe-ai/jev", 3, 5, "test-api-key");

    await expect(matcher.evaluateMatch(clientProduct, candidate)).rejects.toThrow(
      /Fallo de inferencia Jev tras 3 intentos/
    );
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("TC-U-12: falla inmediatamente sin reintentos ante error de autorización o saldo 403", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => "customer_verification_required"
    });

    const matcher = new JevSystemOneMatcher("typesafe-ai/jev", 3, 5, "test-api-key");

    await expect(matcher.evaluateMatch(clientProduct, candidate)).rejects.toThrow(
      /Fallo de autenticacion o saldo en AI Gateway \(HTTP 403\)/
    );
    // Debe haber fallado en el intento 1 sin reintentar
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("lanza error si modelId está vacío", () => {
    expect(() => new JevSystemOneMatcher("")).toThrow(
      "modelId es obligatorio para inicializar JevSystemOneMatcher"
    );
  });

  it("lanza error si apiKey no está configurada", async () => {
    const matcher = new JevSystemOneMatcher("typesafe-ai/jev", 3, 5, "");
    await expect(matcher.evaluateMatch(clientProduct, candidate)).rejects.toThrow(
      "Clave de API no configurada para el servicio de inferencia"
    );
  });

  it("envía la marca en el payload estructurado a AI Gateway", async () => {
    const mockOutput = {
      isMatch: true,
      confidenceScore: 0.92,
      matchType: "EQUIVALENT_VARIANT",
      discrepancyReason: "NONE"
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockOutput) } }]
      })
    });

    const productWithBrand: ClientProduct = {
      ...clientProduct,
      brand: "ENELBROCK"
    };
    const candidateWithBrand: SupplierCandidate = {
      ...candidate,
      brand: "ENELBROCK"
    };

    const matcher = new JevSystemOneMatcher("typesafe-ai/jev", 3, 10, "test-api-key");
    await matcher.evaluateMatch(productWithBrand, candidateWithBrand);

    const callArgs = (vi.mocked(global.fetch).mock.calls[0]![1] as any);
    const bodyObj = JSON.parse(callArgs.body);
    const stateContent = JSON.parse(bodyObj.state ?? bodyObj.messages?.[1]?.content);

    expect(stateContent.clientProduct.brand).toBe("ENELBROCK");
    expect(stateContent.supplierCandidate.brand).toBe("ENELBROCK");
  });

  it("procesa correctamente la respuesta nativa answers del endpoint /evaluate de Jev", async () => {
    const mockJevResponse = {
      model: "typesafe-ai/jev",
      answers: {
        isMatch: {
          type: "boolean",
          probability: 0.94
        },
        matchType: {
          type: "choice",
          choice: "EXACT_CODE",
          probabilities: {
            EXACT_CODE: 0.98,
            EQUIVALENT_VARIANT: 0.02,
            DIFFERENT_PRODUCT: 0.0
          },
          confidence: 0.98
        },
        discrepancyReason: {
          type: "choice",
          choice: "NONE",
          probabilities: {
            NONE: 0.99
          },
          confidence: 0.99
        }
      }
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockJevResponse
    });

    const matcher = new JevSystemOneMatcher("typesafe-ai/jev", 3, 10, "test-api-key");
    const result = await matcher.evaluateMatch(clientProduct, candidate);

    expect(result.isMatch).toBe(true);
    expect(result.matchType).toBe("EXACT_CODE");
    expect(result.discrepancyReason).toBe("NONE");
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.9);
  });
});
