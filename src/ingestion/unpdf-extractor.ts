import { extractText, getDocumentProxy } from "unpdf";
import { ExtractedCatalogItem, IPdfExtractor } from "../types";

/**
 * Extractor adaptativo de texto de documentos PDF utilizando unpdf.
 */
export class UnpdfExtractor implements IPdfExtractor {
  public async extractItems(
    pdfBuffer: ArrayBuffer
  ): Promise<{ items: ExtractedCatalogItem[]; totalPages: number }> {
    if (!pdfBuffer || pdfBuffer.byteLength === 0) {
      throw new Error("El buffer del PDF no puede estar vacío");
    }

    let pdfProxy;
    try {
      pdfProxy = await getDocumentProxy(new Uint8Array(pdfBuffer));
    } catch (error) {
      throw new Error(`Fallo al leer la estructura del PDF: ${(error as Error).message}`);
    }

    const { totalPages, text: pageTexts } = await extractText(pdfProxy, {
      mergePages: false
    });

    const items: ExtractedCatalogItem[] = [];
    const pages = Array.isArray(pageTexts) ? pageTexts : [pageTexts];

    for (const pageText of pages) {
      const lines = pageText.split(/\r?\n/);
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || this.isHeaderOrNoise(line)) {
          continue;
        }

        const parsedItem = this.parseLine(line);
        if (parsedItem) {
          items.push(parsedItem);
        }
      }
    }

    return { items, totalPages };
  }

  private isHeaderOrNoise(line: string): boolean {
    const lower = line.toLowerCase();
    if (
      lower.startsWith("página") ||
      lower.startsWith("pagina") ||
      lower.startsWith("page ") ||
      lower.startsWith("fecha:") ||
      lower.startsWith("usuario:") ||
      lower.startsWith("tlf:") ||
      lower.startsWith("calle ") ||
      lower.startsWith("autorepuestos") ||
      lower.startsWith("lista de precios") ||
      lower.includes("r.i.f") ||
      /^\d{2}\/\d{2}\/\d{4}/.test(line) ||
      /^(sku|código|codigo|referencia|ref|item|cód|cod)(?:[\t|;]|\s{2,}|\s+(?:desc|nom|art|prod|cant|stock|prec|total|marca))/i.test(line) ||
      /(?:sku|código|codigo).*(?:desc|nom).*(?:marca|brand)/i.test(line) ||
      /^={3,}|^---/.test(line)
    ) {
      return true;
    }
    return false;
  }

  private parseLine(line: string): ExtractedCatalogItem | null {
    // 1. Estrategia A: Delimitadores explícitos (\t, |, ;, o 2+ espacios)
    const sep = "(?:\\t|\\||;|\\s{2,})";
    const parts = line.split(new RegExp(sep)).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const rawSku = parts[0]!;
      if (rawSku.length >= 2 && rawSku.split(/\s+/).length <= 2 && rawSku.length <= 40) {
        if (parts.length >= 4) {
          const part3IsNumber = /^\d+$/.test(parts[2]!);
          const part4IsNumber = /^\d+$/.test(parts[3]!);
          if (part4IsNumber) {
            return {
              rawSku,
              rawName: parts[1]!,
              rawBrand: parts[2]!,
              stock: parseInt(parts[3]!, 10)
            };
          } else if (part3IsNumber) {
            return {
              rawSku,
              rawName: parts[1]!,
              rawBrand: parts[3]!,
              stock: parseInt(parts[2]!, 10)
            };
          }
        }
        if (parts.length === 3) {
          const isNumber = /^\d+$/.test(parts[2]!);
          if (isNumber) {
            return {
              rawSku,
              rawName: parts[1]!,
              stock: parseInt(parts[2]!, 10)
            };
          } else {
            return {
              rawSku,
              rawName: parts[1]!,
              rawBrand: parts[2]!,
              stock: 0
            };
          }
        }
        if (parts.length === 2) {
          return {
            rawSku,
            rawName: parts[1]!,
            stock: 0
          };
        }
      }
    }

    const sanitizedLine = line.replace(/;\s*/g, " ");

    // 2. Estrategia B: Catálogos comerciales con stock y montos monetarios (Bs., $, USD, EUR, €)
    // Ejemplo: 8483N-3P-ENELB ALTERNADOR AVEO 1.6L 04-08 12V 85A 3PINE ENELBROCK 25 Bs.107.381,78 $127.50
    const priceWithStockPattern =
      /^\s*(?<sku>[A-Za-z0-9][A-Za-z0-9\-_./]{1,})\s+(?<nameAndBrand>.+?)\s+(?<stock>\d+)\s+(?:Bs\.?|USD|\$|EUR|€)\s*[\d.,]+(?:\s+(?:Bs\.?|USD|\$|EUR|€)\s*[\d.,]+)*\s*$/i;
    const priceWithStockMatch = priceWithStockPattern.exec(sanitizedLine);
    if (priceWithStockMatch?.groups?.["sku"] && priceWithStockMatch?.groups?.["nameAndBrand"]) {
      const rawSku = priceWithStockMatch.groups["sku"].trim();
      const nameAndBrand = priceWithStockMatch.groups["nameAndBrand"].trim();
      const stock = parseInt(priceWithStockMatch.groups["stock"] ?? "0", 10);

      const lastSpace = nameAndBrand.lastIndexOf(" ");
      let rawName = nameAndBrand;
      let rawBrand: string | undefined;

      if (lastSpace > 0) {
        const potentialBrand = nameAndBrand.slice(lastSpace + 1).trim();
        if (potentialBrand.length >= 2 && !/^(12V|24V|4X4|4X2|L|V|CC|MM)$/i.test(potentialBrand)) {
          rawName = nameAndBrand.slice(0, lastSpace).trim();
          rawBrand = potentialBrand;
        }
      }

      return {
        rawSku,
        rawName,
        rawBrand,
        stock: isNaN(stock) ? 0 : Math.max(0, stock)
      };
    }

    // 3. Estrategia C: Listas de precios comerciales estándar con precio decimal final
    // Ejemplo: 8483N-3P ALTERNADOR AVEO 1.6L ... ENELBROCK 138,75
    const trailingPriceMatch = /\s+(?:(?:\$|USD|Bs\.?|EUR|€)\s*)?(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*$/i.exec(sanitizedLine);
    if (trailingPriceMatch && trailingPriceMatch.index > 0) {
      const beforePrice = sanitizedLine.slice(0, trailingPriceMatch.index).trim();
      const firstSpace = beforePrice.indexOf(" ");
      if (firstSpace > 0) {
        const rawSku = beforePrice.slice(0, firstSpace).trim();
        const rest = beforePrice.slice(firstSpace).trim();
        if (rawSku.length >= 2 && rest.length >= 2) {
          const lastSpace = rest.lastIndexOf(" ");
          let rawName = rest;
          let rawBrand: string | undefined;

          if (lastSpace > 0) {
            const potentialBrand = rest.slice(lastSpace + 1).trim();
            if (potentialBrand.length >= 2 && !/^(12V|24V|4X4|4X2|L|V|CC|MM)$/i.test(potentialBrand)) {
              rawName = rest.slice(0, lastSpace).trim();
              rawBrand = potentialBrand;
            }
          }

          return {
            rawSku,
            rawName,
            rawBrand,
            stock: 0
          };
        }
      }
    }

    return null;
  }
}
