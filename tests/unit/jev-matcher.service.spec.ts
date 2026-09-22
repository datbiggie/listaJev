import { describe, it, expect, vi, beforeEach } from "vitest";
import { JevSystemOneMatcher } from "../../src/jev-matcher.service.js";
import { experimental_evaluate } from "ai";
import { ClientProduct, SupplierCandidate } from "../../src/types.js";

vi.mock("ai", () => ({
  experimental_evaluate: vi.fn()
}));

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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TC-U-08: realiza inferencia exitosa y valida contra ProductMatchResultSchema", async () => {
    const mockOutput = {
      isMatch: true,
      confidenceScore: 0.95,
      matchType: "EQUIVALENT_VARIANT",
      discrepancyReason: "NONE"
    };

    vi.mocked(experimental_evaluate).mockResolvedValueOnce(mockOutput);

    const matcher = new JevSystemOneMatcher("typesafe-ai/jev", 3, 10);
    const result = await matcher.evaluateMatch(clientProduct, candidate);

    expect(result).toEqual(mockOutput);
    expect(experimental_evaluate).toHaveBeenCalledTimes(1);
  });

  it("TC-U-09: intercepta respuestas del modelo que violan el contrato de esquema Zod", async () => {
    const invalidOutput = {
      isMatch: true,
      confidenceScore: 2.5, // Fuera del rango [0.0, 1.0]
      matchType: "INVALID_TYPE",
      discrepancyReason: "NONE"
    };

    vi.mocked(experimental_evaluate).mockResolvedValue(invalidOutput);

    const matcher = new JevSystemOneMatcher("typesafe-ai/jev", 2, 5);

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

    vi.mocked(experimental_evaluate)
      .mockRejectedValueOnce(new Error("HTTP 429 Too Many Requests"))
      .mockRejectedValueOnce(new Error("HTTP 503 Service Unavailable"))
      .mockResolvedValueOnce(validOutput);

    const matcher = new JevSystemOneMatcher("typesafe-ai/jev", 3, 5);
    const result = await matcher.evaluateMatch(clientProduct, candidate);

    expect(result).toEqual(validOutput);
    expect(experimental_evaluate).toHaveBeenCalledTimes(3);
  });

  it("TC-U-11: agota reintentos y lanza excepción descriptiva", async () => {
    vi.mocked(experimental_evaluate).mockRejectedValue(
      new Error("HTTP 500 Internal Gateway Error")
    );

    const matcher = new JevSystemOneMatcher("typesafe-ai/jev", 3, 5);

    await expect(matcher.evaluateMatch(clientProduct, candidate)).rejects.toThrow(
      "Fallo de inferencia Jev tras 3 intentos: HTTP 500 Internal Gateway Error"
    );
    expect(experimental_evaluate).toHaveBeenCalledTimes(3);
  });

  it("lanza error si modelId está vacío", () => {
    expect(() => new JevSystemOneMatcher("")).toThrow(
      "modelId es obligatorio para inicializar JevSystemOneMatcher"
    );
  });
});
