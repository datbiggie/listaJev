import { describe, it, expect } from "vitest";
import {
  normalizeSku,
  sanitizeProductName,
  sanitizeBrand,
  brandsAreCompatible,
  extractSkuRoot,
  getCompatibleBrandTokens
} from "../../src/sku-normalizer.js";

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

  describe("sanitizeBrand", () => {
    it("convierte a mayúsculas y normaliza espacios en blanco", () => {
      expect(sanitizeBrand("  enelbrock   ")).toBe("ENELBROCK");
      expect(sanitizeBrand("korea  porter")).toBe("KOREA PORTER");
    });

    it("retorna null para valores no definidos, vacíos o N/A", () => {
      expect(sanitizeBrand(null)).toBeNull();
      expect(sanitizeBrand(undefined)).toBeNull();
      expect(sanitizeBrand("")).toBeNull();
      expect(sanitizeBrand("   ")).toBeNull();
      expect(sanitizeBrand("N/A")).toBeNull();
      expect(sanitizeBrand("NULL")).toBeNull();
    });
  });

  describe("brandsAreCompatible", () => {
    it("valida marcas idénticas sin distinguir mayúsculas ni espacios", () => {
      expect(brandsAreCompatible("ENELBROCK", "enelbrock")).toBe(true);
      expect(brandsAreCompatible("KOYO", "KOYO")).toBe(true);
    });

    it("reconoce aliases conocidos como ENELB y ENELBROCK", () => {
      expect(brandsAreCompatible("ENELB", "ENELBROCK")).toBe(true);
      expect(brandsAreCompatible("PORTER", "KOREA-PORTER")).toBe(true);
    });

    it("identifica marcas incompatibles o distintas", () => {
      expect(brandsAreCompatible("BOSCH", "VALEO")).toBe(false);
      expect(brandsAreCompatible("ENELBROCK", "DENSO")).toBe(false);
      expect(brandsAreCompatible("TIMKEN", "KOYO")).toBe(false);
    });

    it("retorna true si alguna de las marcas no está definida", () => {
      expect(brandsAreCompatible(null, "BOSCH")).toBe(true);
      expect(brandsAreCompatible("VALEO", undefined)).toBe(true);
      expect(brandsAreCompatible(null, null)).toBe(true);
    });
  });

  describe("extractSkuRoot", () => {
    it("descompone SKUs con sufijo de marca separado por guión", () => {
      const res1 = extractSkuRoot("M546-ENELB");
      expect(res1.rootSku).toBe("M546");
      expect(res1.brandToken).toBe("ENELB");

      const res2 = extractSkuRoot("C1098-ENELBROCK");
      expect(res2.rootSku).toBe("C1098");
      expect(res2.brandToken).toBe("ENELBROCK");
    });

    it("descompone SKUs con prefijo de marca separado por guión", () => {
      const res = extractSkuRoot("ENELB-M546");
      expect(res.rootSku).toBe("M546");
      expect(res.brandToken).toBe("ENELB");
    });

    it("mantiene intacto un SKU que no contiene marcas conocidas", () => {
      const res1 = extractSkuRoot("C1098");
      expect(res1.rootSku).toBe("C1098");
      expect(res1.brandToken).toBeNull();

      const res2 = extractSkuRoot("M546");
      expect(res2.rootSku).toBe("M546");
      expect(res2.brandToken).toBeNull();
    });

    it("extrae baseCode cuando hay delimitador sin marca conocida", () => {
      const res = extractSkuRoot("PROD-12345");
      expect(res.rootSku).toBe("PROD12345");
      expect(res.baseCode).toBe("PROD");
      expect(res.brandToken).toBeNull();
    });

    it("detecta sufijos de marca unidos sin delimitador", () => {
      const res = extractSkuRoot("C1098ENELBROCK");
      expect(res.rootSku).toBe("C1098");
      expect(res.brandToken).toBe("ENELBROCK");
    });
  });

  describe("getCompatibleBrandTokens", () => {
    it("obtiene tokens compatibles para Enelbrock incluyendo alias", () => {
      const tokens = getCompatibleBrandTokens("Enelbrock");
      expect(tokens).toContain("ENELBROCK");
      expect(tokens).toContain("ENELB");
    });

    it("retorna arreglo vacío si la marca es nula o vacía", () => {
      expect(getCompatibleBrandTokens(null)).toEqual([]);
      expect(getCompatibleBrandTokens("")).toEqual([]);
    });
  });
});

