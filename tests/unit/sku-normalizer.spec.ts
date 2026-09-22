import { describe, it, expect } from "vitest";
import { normalizeSku, sanitizeProductName } from "../../src/sku-normalizer.js";

describe("SPEC-NORM-002: Normalización de SKUs y Sanitización de Nombres", () => {
  describe("normalizeSku", () => {
    it("TC-SKU-01: elimina guiones en SKUs", () => {
      expect(normalizeSku("PROD-12345")).toBe("PROD12345");
    });

    it("TC-SKU-02: remueve espacios, hace trim y convierte a mayúsculas", () => {
      expect(normalizeSku("  prod 12345  ")).toBe("PROD12345");
    });

    it("TC-SKU-03: remueve guiones bajos y barras inclinadas", () => {
      expect(normalizeSku("sku_abc-789/x")).toBe("SKUABC789X");
    });

    it("TC-SKU-04: remueve puntos y guiones en códigos versionados", () => {
      expect(normalizeSku("999.001.002-A")).toBe("999001002A");
    });

    it("TC-SKU-05: remueve caracteres especiales y símbolos", () => {
      expect(normalizeSku("SKU#@!$%123")).toBe("SKU123");
    });

    it("TC-SKU-06: maneja de forma segura cadenas vacías", () => {
      expect(normalizeSku("")).toBe("");
    });

    it("TC-SKU-07: maneja cadenas que contienen únicamente espacios", () => {
      expect(normalizeSku("   ")).toBe("");
    });

    it("TC-SKU-08: mantiene inalterado un SKU ya normalizado (idempotencia)", () => {
      const limpio = "A1B2C3";
      expect(normalizeSku(limpio)).toBe(limpio);
      expect(normalizeSku(normalizeSku(limpio))).toBe(limpio);
    });

    it("lanza TypeError ante tipos que no son string", () => {
      // @ts-expect-error validación en runtime
      expect(() => normalizeSku(null)).toThrow(TypeError);
      // @ts-expect-error validación en runtime
      expect(() => normalizeSku(undefined)).toThrow(TypeError);
      // @ts-expect-error validación en runtime
      expect(() => normalizeSku(12345)).toThrow(TypeError);
    });
  });

  describe("sanitizeProductName", () => {
    it("TC-NAME-01: colapsa múltiples espacios consecutivos y hace trim", () => {
      expect(sanitizeProductName("  Tornillo   Hexagonal   1/2\"  ")).toBe("Tornillo Hexagonal 1/2\"");
    });

    it("TC-NAME-02: reemplaza tabuladores y saltos de línea por espacios simples", () => {
      expect(sanitizeProductName("Tuerca\tM10\nZincada")).toBe("Tuerca M10 Zincada");
    });

    it("TC-NAME-03: preserva acentos, caracteres especiales y mayúsculas/minúsculas", () => {
      expect(sanitizeProductName("Arandela de Presión 3/8")).toBe("Arandela de Presión 3/8");
    });

    it("TC-NAME-04: colapsa cadenas de espacios en blanco a cadena vacía", () => {
      expect(sanitizeProductName("   ")).toBe("");
    });

    it("lanza TypeError ante tipos no string", () => {
      // @ts-expect-error validación en runtime
      expect(() => sanitizeProductName(null)).toThrow(TypeError);
    });
  });
});
