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
