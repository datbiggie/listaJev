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
      /^(sku|código|codigo|referencia|ref|item|cód|cod)(?:[\t|;]|\s{2,}|\s+(?:desc|nom|art|prod|cant|stock|prec|total))/i.test(line) ||
      /^={3,}|^---/.test(line)
    ) {
      return true;
    }
    return false;
  }

  private parseLine(line: string): ExtractedCatalogItem | null {
    // 1. Estrategia A: Delimitadores explícitos (\t, |, ;, o 2+ espacios)
    const sep = "(?:\\t|\\||;|\\s{2,})";
    const pattern = new RegExp(
      `^\\s*(?<sku>[A-Za-z0-9\\-_\\.\\/]{2,})\\s*${sep}\\s*(?<name>.+?)(?:\\s*${sep}\\s*(?<stock>\\d+))?\\s*$`
    );
    const match = pattern.exec(line);
    if (match?.groups?.["sku"] && match?.groups?.["name"]) {
      const rawSku = match.groups["sku"].trim();
      const rawName = match.groups["name"].trim();
      const stockStr = match.groups["stock"];
      const stock = stockStr !== undefined ? parseInt(stockStr, 10) : 0;
      return {
        rawSku,
        rawName,
        stock: isNaN(stock) ? 0 : Math.max(0, stock)
      };
    }

    // 2. Estrategia B: Catálogos comerciales con stock y montos monetarios (Bs., $, USD, EUR, €)
    // Ejemplo: 8483N-3P-ENELB ALTERNADOR AVEO ... ENELBROCK 25 Bs.107.381,78 $127.50
    const priceWithStockPattern =
      /^\s*(?<sku>[A-Za-z0-9][A-Za-z0-9\-_./]{1,})\s+(?<name>.+?)\s+(?<stock>\d+)\s+(?:Bs\.?|USD|\$|EUR|€)\s*[\d.,]+(?:\s+(?:Bs\.?|USD|\$|EUR|€)\s*[\d.,]+)*\s*$/i;
    const priceWithStockMatch = priceWithStockPattern.exec(line);
    if (priceWithStockMatch?.groups?.["sku"] && priceWithStockMatch?.groups?.["name"]) {
      const rawSku = priceWithStockMatch.groups["sku"].trim();
      const rawName = priceWithStockMatch.groups["name"].trim();
      const stock = parseInt(priceWithStockMatch.groups["stock"] ?? "0", 10);
      return {
        rawSku,
        rawName,
        stock: isNaN(stock) ? 0 : Math.max(0, stock)
      };
    }

    // 3. Estrategia C: Listas de precios comerciales estándar con precio decimal final
    // Ejemplo: 8483N-3P ALTERNADOR AVEO 1.6L ... ENELBROCK 138,75
    const trailingPriceMatch = /\s+(?:(?:\$|USD|Bs\.?|EUR|€)\s*)?(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*$/i.exec(line);
    if (trailingPriceMatch && trailingPriceMatch.index > 0) {
      const beforePrice = line.slice(0, trailingPriceMatch.index).trim();
      const firstSpace = beforePrice.indexOf(" ");
      if (firstSpace > 0) {
        const rawSku = beforePrice.slice(0, firstSpace).trim();
        const rawName = beforePrice.slice(firstSpace).trim();
        if (rawSku.length >= 2 && rawName.length >= 2) {
          return {
            rawSku,
            rawName,
            stock: 0
          };
        }
      }
    }

    return null;
  }
}
