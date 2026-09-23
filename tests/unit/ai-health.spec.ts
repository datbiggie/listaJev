import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkAiServiceHealth } from "../../src/lib/ai-health.js";

describe("ai-health: Comprobación de estado de Vercel AI Gateway", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("retorna ONLINE cuando el endpoint responde con HTTP 200", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 200
    });

    const health = await checkAiServiceHealth("test-api-key");

    expect(health.status).toBe("ONLINE");
    expect(health.message).toContain("En línea");
  });

  it("retorna UNVERIFIED cuando el endpoint responde con HTTP 403", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 403
    });

    const health = await checkAiServiceHealth("test-api-key");

    expect(health.status).toBe("UNVERIFIED");
    expect(health.statusCode).toBe(403);
    expect(health.message).toContain("Requiere verificación");
  });

  it("retorna ERROR cuando ocurre un fallo de red o timeout", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network timeout"));

    const health = await checkAiServiceHealth("test-api-key");

    expect(health.status).toBe("ERROR");
    expect(health.message).toContain("Network timeout");
  });

  it("retorna NOT_CONFIGURED cuando la clave de API está vacía", async () => {
    const health = await checkAiServiceHealth("");

    expect(health.status).toBe("NOT_CONFIGURED");
    expect(health.message).toContain("Clave de API no configurada");
  });
});
