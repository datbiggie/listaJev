import { describe, it, expect, vi, beforeEach } from "vitest";
import { UnpdfExtractor } from "../../src/ingestion/unpdf-extractor.js";
import { getDocumentProxy, extractText } from "unpdf";

vi.mock("unpdf", () => ({
  getDocumentProxy: vi.fn(),
  extractText: vi.fn()
}));

describe("SPEC-INGEST-PDF-010: UnpdfExtractor", () => {
  let extractor: UnpdfExtractor;

  beforeEach(() => {
    vi.clearAllMocks();
    extractor = new UnpdfExtractor();
  });

  it("rechaza buffers vacíos o inválidos", async () => {
    const emptyBuffer = new ArrayBuffer(0);
    await expect(extractor.extractItems(emptyBuffer)).rejects.toThrow(
      "El buffer del PDF no puede estar vacío"
    );
  });

  it("captura errores de lectura del PDF y lanza excepción controlada", async () => {
    vi.mocked(getDocumentProxy).mockRejectedValueOnce(new Error("Formato PDF no reconocido"));

    const dummyBuffer = new Uint8Array([1, 2, 3, 4]).buffer;
    await expect(extractor.extractItems(dummyBuffer)).rejects.toThrow(
      "Fallo al leer la estructura del PDF: Formato PDF no reconocido"
    );
  });

  it("extrae ítems válidos descartando encabezados, números de página y líneas de ruido", async () => {
    const mockPageText = `
      CATALOGO GENERAL DE PRODUCTOS 2026
      Página 1 de 5
      SKU\tDESCRIPCION\tSTOCK
      PROD-001\tTornillo Hexagonal 1/2\t50
      PROD-002  Tuerca M10 Zincada  100
      SUP-999 | Arandela de Presión 3/8 | 0
      ITEM-123; Clavo de Acero 2 in
      Línea de texto descriptivo sin formato de tabla
      --- Fin de Página ---
    `;

    vi.mocked(getDocumentProxy).mockResolvedValueOnce({} as any);
    vi.mocked(extractText).mockResolvedValueOnce({
      totalPages: 1,
      text: [mockPageText]
    });

    const dummyBuffer = new Uint8Array([37, 80, 68, 70]).buffer; // %PDF
    const result = await extractor.extractItems(dummyBuffer);

    expect(result.totalPages).toBe(1);
    expect(result.items).toHaveLength(4);

    expect(result.items[0]).toEqual({
      rawSku: "PROD-001",
      rawName: "Tornillo Hexagonal 1/2",
      stock: 50
    });

    expect(result.items[1]).toEqual({
      rawSku: "PROD-002",
      rawName: "Tuerca M10 Zincada",
      stock: 100
    });

    expect(result.items[2]).toEqual({
      rawSku: "SUP-999",
      rawName: "Arandela de Presión 3/8",
      stock: 0
    });

    expect(result.items[3]).toEqual({
      rawSku: "ITEM-123",
      rawName: "Clavo de Acero 2 in",
      stock: 0
    });
  });

  it("soporta procesamiento de múltiples páginas", async () => {
    const page1 = "SKU-001\tProducto Pag 1\t10";
    const page2 = "SKU-002\tProducto Pag 2\t20";

    vi.mocked(getDocumentProxy).mockResolvedValueOnce({} as any);
    vi.mocked(extractText).mockResolvedValueOnce({
      totalPages: 2,
      text: [page1, page2]
    });

    const dummyBuffer = new Uint8Array([37, 80, 68, 70]).buffer;
    const result = await extractor.extractItems(dummyBuffer);

    expect(result.totalPages).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.rawSku).toBe("SKU-001");
    expect(result.items[1]?.rawSku).toBe("SKU-002");
  });

  it("extrae ítems de listas de precios comerciales tabulares con precio decimal al final", async () => {
    const mockPageText = `
      LISTA DE PRECIOS
      AUTOREPUESTOS JOHBRI, C.A.
      TLF.: 0424-6985089 | R.I.F.: J-50183072-0
      Código Descripción Precio $USDMarca
      8483N-3P ALTERNADOR AVEO 1.6L 04/08 12V SISTEMA IAC SIST. DELCO AD221 12V 85A 3 PINES ENELBROCK 138,75
      001 BORNE DE PLOMO PARA AUTOMOVIL PEQUEÑO NACIONAL 1,45
      8200678386 VARILLA MEDIR ACEITE RENAULT LOGAN SYMBO L 1.6L 8V ENELBROCK 4,69
      Página 1
    `;

    vi.mocked(getDocumentProxy).mockResolvedValueOnce({} as any);
    vi.mocked(extractText).mockResolvedValueOnce({
      totalPages: 1,
      text: [mockPageText]
    });

    const dummyBuffer = new Uint8Array([37, 80, 68, 70]).buffer;
    const result = await extractor.extractItems(dummyBuffer);

    expect(result.totalPages).toBe(1);
    expect(result.items).toHaveLength(3);
    expect(result.items[0]?.rawSku).toBe("8483N-3P");
    expect(result.items[0]?.rawName).toBe(
      "ALTERNADOR AVEO 1.6L 04/08 12V SISTEMA IAC SIST. DELCO AD221 12V 85A 3 PINES"
    );
    expect(result.items[0]?.rawBrand).toBe("ENELBROCK");
    expect(result.items[0]?.stock).toBe(0);

    expect(result.items[1]?.rawSku).toBe("001");
    expect(result.items[1]?.rawName).toBe("BORNE DE PLOMO PARA AUTOMOVIL PEQUEÑO");
    expect(result.items[1]?.rawBrand).toBe("NACIONAL");

    expect(result.items[2]?.rawSku).toBe("8200678386");
    expect(result.items[2]?.rawName).toBe("VARILLA MEDIR ACEITE RENAULT LOGAN SYMBO L 1.6L 8V");
    expect(result.items[2]?.rawBrand).toBe("ENELBROCK");
  });

  it("extrae correctamente líneas con puntos y comas accidentales en la descripción o marca", async () => {
    const mockPageText = `
      LISTA DE PRECIOS
      SE9015416 SENSOR MAP GM AVEO 1.6 LS CHERY QQ OEM; PORTER 36 Bs.12.548,93 $14.90
    `;

    vi.mocked(getDocumentProxy).mockResolvedValueOnce({} as any);
    vi.mocked(extractText).mockResolvedValueOnce({
      totalPages: 1,
      text: [mockPageText]
    });

    const dummyBuffer = new Uint8Array([37, 80, 68, 70]).buffer;
    const result = await extractor.extractItems(dummyBuffer);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.rawSku).toBe("SE9015416");
    expect(result.items[0]?.rawName).toBe("SENSOR MAP GM AVEO 1.6 LS CHERY QQ OEM");
    expect(result.items[0]?.rawBrand).toBe("PORTER");
    expect(result.items[0]?.stock).toBe(36);
  });

  it("extrae correctamente SKUs compuestos con espacio (ej. 25 MIN, 20 HEM, 30 MACHO)", async () => {
    const mockPageText = `
      LISTA DE PRECIOS
      25 MIN FUSIBLE MODERNO MINI 25 AMP (100 PZAS) ENELBROCK 1183 Bs.3.368,84 $4.00
      20 HEM FUSIBLE TIPO HEMBRA 20 AMP ENELBROCK 2020 Bs.387,42 $0.46
      30 MACHO FUSIBLE TOYOTA MACHO 30 AMP NACIONAL 604 Bs.336,88 $0.40
      001 BORNE DE PLOMO PARA AUTOMOVIL PEQUEÑO NACIONAL 3 Bs.1.541,24 $1.83
    `;

    vi.mocked(getDocumentProxy).mockResolvedValueOnce({} as any);
    vi.mocked(extractText).mockResolvedValueOnce({
      totalPages: 1,
      text: [mockPageText]
    });

    const dummyBuffer = new Uint8Array([37, 80, 68, 70]).buffer;
    const result = await extractor.extractItems(dummyBuffer);

    expect(result.items).toHaveLength(4);

    expect(result.items[0]?.rawSku).toBe("25 MIN");
    expect(result.items[0]?.rawName).toBe("FUSIBLE MODERNO MINI 25 AMP (100 PZAS)");
    expect(result.items[0]?.rawBrand).toBe("ENELBROCK");
    expect(result.items[0]?.stock).toBe(1183);

    expect(result.items[1]?.rawSku).toBe("20 HEM");
    expect(result.items[1]?.rawName).toBe("FUSIBLE TIPO HEMBRA 20 AMP");
    expect(result.items[1]?.rawBrand).toBe("ENELBROCK");
    expect(result.items[1]?.stock).toBe(2020);

    expect(result.items[2]?.rawSku).toBe("30 MACHO");
    expect(result.items[2]?.rawName).toBe("FUSIBLE TOYOTA MACHO 30 AMP");
    expect(result.items[2]?.rawBrand).toBe("NACIONAL");
    expect(result.items[2]?.stock).toBe(604);

    // Verifica que un SKU numérico simple como "001" no se fusione con la descripción
    expect(result.items[3]?.rawSku).toBe("001");
    expect(result.items[3]?.rawName).toBe("BORNE DE PLOMO PARA AUTOMOVIL PEQUEÑO");
    expect(result.items[3]?.rawBrand).toBe("NACIONAL");
    expect(result.items[3]?.stock).toBe(3);
  });
});
