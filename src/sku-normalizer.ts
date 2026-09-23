import { BrandAliasMap, SkuDecomposition } from "./types";

export const DEFAULT_BRAND_ALIASES: BrandAliasMap = {
  ENELBROCK: ["ENELB", "ENELBROCK"],
  PORTER: ["PORTER", "KOREA-PORTER", "KOREAPORTER"]
};

/**
 * Sanitiza y normaliza un SKU removiendo todo caracter que no sea alfanumérico
 * y transformando el resultado a mayúsculas.
 *
 * @param rawSku - Código SKU original provisto en la ingesta.
 * @returns Cadena normalizada alfanumérica en mayúsculas sin espacios ni símbolos.
 */
export function normalizeSku(rawSku: string): string {
  if (typeof rawSku !== "string") {
    throw new TypeError("rawSku debe ser una cadena de texto");
  }
  return rawSku.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Sanitiza el nombre comercial del producto normalizando espacios en blanco
 * continuos y eliminando espacios al inicio y al final.
 *
 * @param rawName - Nombre o descripción bruta del producto.
 * @returns Cadena con espacios unificados sin alterar la capitalización ni caracteres especiales del nombre.
 */
export function sanitizeProductName(rawName: string): string {
  if (typeof rawName !== "string") {
    throw new TypeError("rawName debe ser una cadena de texto");
  }
  return rawName.trim().replace(/\s+/g, " ");
}

/**
 * Sanitiza y estandariza la denominación de la marca comercial.
 *
 * @param rawBrand - Denominación en bruto de la marca detectada.
 * @returns Marca en mayúsculas limpia o null si no está definida o está vacía.
 */
export function sanitizeBrand(rawBrand?: string | null): string | null {
  if (!rawBrand || typeof rawBrand !== "string") {
    return null;
  }
  const cleaned = rawBrand.trim().replace(/\s+/g, " ").toUpperCase();
  if (cleaned.length === 0 || cleaned === "N/A" || cleaned === "NULL") {
    return null;
  }
  return cleaned;
}

/**
 * Obtiene todos los tokens o alias normalizados para una marca específica.
 *
 * @param brand - Denominación de la marca comercial.
 * @param aliasMap - Diccionario configurable de marcas y alias.
 * @returns Arreglo de tokens normalizados en mayúsculas.
 */
export function getCompatibleBrandTokens(
  brand?: string | null,
  aliasMap: BrandAliasMap = DEFAULT_BRAND_ALIASES
): string[] {
  const sanitized = sanitizeBrand(brand);
  if (!sanitized) {
    return [];
  }
  const cleanNorm = sanitized.replace(/[^A-Z0-9]/g, "");
  const matchedTokens = new Set<string>([sanitized, cleanNorm]);

  for (const [primaryBrand, aliases] of Object.entries(aliasMap)) {
    const normPrimary = primaryBrand.replace(/[^A-Z0-9]/g, "").toUpperCase();
    const normAliases = aliases.map((a) => a.replace(/[^A-Z0-9]/g, "").toUpperCase());

    const isMatch =
      normPrimary === cleanNorm ||
      normAliases.includes(cleanNorm) ||
      normAliases.some((alias) => cleanNorm.includes(alias) || alias.includes(cleanNorm));

    if (isMatch) {
      matchedTokens.add(primaryBrand.toUpperCase());
      matchedTokens.add(normPrimary);
      for (const a of aliases) {
        matchedTokens.add(a.toUpperCase());
        matchedTokens.add(a.replace(/[^A-Z0-9]/g, "").toUpperCase());
      }
    }
  }

  return Array.from(matchedTokens);
}

/**
 * Descompone un SKU en su código raíz (rootSku) y un token de marca (brandToken).
 * Maneja delimitadores comunes (guiones, guiones bajos, barras) y sufijos de marcas conocidas.
 *
 * @param rawSku - Código SKU original provisto.
 * @param aliasMap - Diccionario configurable de marcas y alias.
 * @returns Descomposición con rootSku, brandToken y baseCode.
 */
export function extractSkuRoot(
  rawSku: string,
  aliasMap: BrandAliasMap = DEFAULT_BRAND_ALIASES
): SkuDecomposition {
  if (typeof rawSku !== "string") {
    throw new TypeError("rawSku debe ser una cadena de texto");
  }

  const trimmed = rawSku.trim().toUpperCase();
  if (trimmed.length === 0) {
    return { rootSku: "", brandToken: null, baseCode: "" };
  }

  const allKnownTokens: string[] = [];
  for (const [primary, aliases] of Object.entries(aliasMap)) {
    allKnownTokens.push(primary.toUpperCase());
    for (const alias of aliases) {
      allKnownTokens.push(alias.toUpperCase());
    }
  }
  allKnownTokens.sort((a, b) => b.length - a.length);

  const delimiterParts = trimmed.split(/[-_/]/).filter((p) => p.length > 0);
  if (delimiterParts.length >= 2) {
    const firstPart = delimiterParts[0]!;
    const lastPart = delimiterParts[delimiterParts.length - 1]!;

    const lastNorm = lastPart.replace(/[^A-Z0-9]/g, "");
    const exactMatchAtEnd = allKnownTokens.find((token) => lastNorm === token.replace(/[^A-Z0-9]/g, ""));
    const matchingBrandAtEnd = exactMatchAtEnd ?? allKnownTokens.find((token) => {
      const normToken = token.replace(/[^A-Z0-9]/g, "");
      return lastNorm.includes(normToken) || normToken.includes(lastNorm);
    });

    if (matchingBrandAtEnd) {
      const rootParts = delimiterParts.slice(0, delimiterParts.length - 1);
      const rootClean = normalizeSku(rootParts.join(""));
      return {
        rootSku: rootClean,
        brandToken: matchingBrandAtEnd,
        baseCode: normalizeSku(firstPart)
      };
    }

    const firstNorm = firstPart.replace(/[^A-Z0-9]/g, "");
    const exactMatchAtStart = allKnownTokens.find((token) => firstNorm === token.replace(/[^A-Z0-9]/g, ""));
    const matchingBrandAtStart = exactMatchAtStart ?? allKnownTokens.find((token) => {
      const normToken = token.replace(/[^A-Z0-9]/g, "");
      return firstNorm.includes(normToken) || normToken.includes(firstNorm);
    });

    if (matchingBrandAtStart) {
      const rootParts = delimiterParts.slice(1);
      const rootClean = normalizeSku(rootParts.join(""));
      return {
        rootSku: rootClean,
        brandToken: matchingBrandAtStart,
        baseCode: rootClean
      };
    }

    const baseCode = normalizeSku(firstPart);
    return {
      rootSku: normalizeSku(trimmed),
      brandToken: null,
      baseCode: baseCode.length >= 3 ? baseCode : normalizeSku(trimmed)
    };
  }

  const normSku = normalizeSku(trimmed);
  for (const token of allKnownTokens) {
    const normToken = token.replace(/[^A-Z0-9]/g, "");
    if (normToken.length >= 3 && normSku.endsWith(normToken) && normSku.length > normToken.length) {
      const candidateRoot = normSku.slice(0, normSku.length - normToken.length);
      if (candidateRoot.length >= 2) {
        return {
          rootSku: candidateRoot,
          brandToken: token,
          baseCode: candidateRoot
        };
      }
    }
  }

  return {
    rootSku: normSku,
    brandToken: null,
    baseCode: normSku
  };
}

/**
 * Evalúa si dos marcas comerciales son compatibles o equivalentes entre catálogos.
 *
 * @param brandA - Marca del producto cliente.
 * @param brandB - Marca del producto proveedor.
 * @param aliasMap - Diccionario configurable de marcas y alias.
 * @returns Verdadero si las marcas son idénticas, aliases conocidos o una de ellas es omitida.
 */
export function brandsAreCompatible(
  brandA?: string | null,
  brandB?: string | null,
  aliasMap: BrandAliasMap = DEFAULT_BRAND_ALIASES
): boolean {
  const sanitizedA = sanitizeBrand(brandA);
  const sanitizedB = sanitizeBrand(brandB);

  if (!sanitizedA || !sanitizedB) {
    return true;
  }

  const normA = sanitizedA.replace(/[^A-Z0-9]/g, "");
  const normB = sanitizedB.replace(/[^A-Z0-9]/g, "");

  if (normA === normB) {
    return true;
  }

  for (const [primaryBrand, aliases] of Object.entries(aliasMap)) {
    const normalizedGroup = [primaryBrand, ...aliases].map((val) =>
      val.replace(/[^A-Z0-9]/g, "").toUpperCase()
    );

    const matchesA = normalizedGroup.some(
      (token) => normA === token || normA.includes(token) || token.includes(normA)
    );
    const matchesB = normalizedGroup.some(
      (token) => normB === token || normB.includes(token) || token.includes(normB)
    );

    if (matchesA && matchesB) {
      return true;
    }
  }

  return false;
}
