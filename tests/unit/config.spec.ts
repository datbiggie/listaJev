import { describe, it, expect } from "vitest";
import { loadConfig } from "../../src/config.js";

describe("SPEC-CONF-003: Configuración y Validación de Entorno", () => {
  const validEnv: NodeJS.ProcessEnv = {
    DATABASE_URL: "postgresql://user:password@localhost:5432/test_db",
    AI_GATEWAY_API_KEY: "secret-ai-token"
  };

  it("carga exitosamente con valores válidos y aplica valores por defecto", () => {
    const config = loadConfig(validEnv);

    expect(config.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(config.AI_GATEWAY_API_KEY).toBe(validEnv.AI_GATEWAY_API_KEY);
    expect(config.JEV_MODEL_ID).toBe("typesafe-ai/jev");
    expect(config.BATCH_SIZE).toBe(50);
    expect(config.MAX_CONCURRENCY).toBe(5);
    expect(config.PG_TRGM_THRESHOLD).toBe(0.60);
    expect(config.CONFIRMED_MATCH_THRESHOLD).toBe(0.90);
    expect(config.REVIEW_MATCH_THRESHOLD).toBe(0.70);
  });

  it("coacciona valores numéricos desde cadenas de texto válidas", () => {
    const customEnv: NodeJS.ProcessEnv = {
      ...validEnv,
      BATCH_SIZE: "100",
      MAX_CONCURRENCY: "10",
      PG_TRGM_THRESHOLD: "0.55",
      CONFIRMED_MATCH_THRESHOLD: "0.95",
      REVIEW_MATCH_THRESHOLD: "0.80"
    };

    const config = loadConfig(customEnv);
    expect(config.BATCH_SIZE).toBe(100);
    expect(config.MAX_CONCURRENCY).toBe(10);
    expect(config.PG_TRGM_THRESHOLD).toBe(0.55);
    expect(config.CONFIRMED_MATCH_THRESHOLD).toBe(0.95);
    expect(config.REVIEW_MATCH_THRESHOLD).toBe(0.80);
  });

  it("falla si AI_GATEWAY_API_KEY no está definida o está vacía", () => {
    const invalidEnv = { ...validEnv, AI_GATEWAY_API_KEY: "" };
    expect(() => loadConfig(invalidEnv)).toThrowError(/AI_GATEWAY_API_KEY/);
  });

  it("falla si DATABASE_URL no es una URL válida", () => {
    const invalidEnv = { ...validEnv, DATABASE_URL: "invalid-url-string" };
    expect(() => loadConfig(invalidEnv)).toThrowError(/DATABASE_URL/);
  });

  it("falla si CONFIRMED_MATCH_THRESHOLD no es estrictamente mayor a REVIEW_MATCH_THRESHOLD", () => {
    const inconsistentEnv: NodeJS.ProcessEnv = {
      ...validEnv,
      CONFIRMED_MATCH_THRESHOLD: "0.75",
      REVIEW_MATCH_THRESHOLD: "0.80"
    };
    expect(() => loadConfig(inconsistentEnv)).toThrowError(
      /CONFIRMED_MATCH_THRESHOLD debe ser estrictamente mayor que REVIEW_MATCH_THRESHOLD/
    );
  });

  it("falla si los umbrales están fuera del rango [0.0, 1.0]", () => {
    const outOfBoundsEnv: NodeJS.ProcessEnv = {
      ...validEnv,
      PG_TRGM_THRESHOLD: "1.5"
    };
    expect(() => loadConfig(outOfBoundsEnv)).toThrowError(/PG_TRGM_THRESHOLD/);
  });
});
