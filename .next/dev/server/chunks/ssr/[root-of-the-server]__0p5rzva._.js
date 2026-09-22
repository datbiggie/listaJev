module.exports = [
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/src/app/dashboard/stock/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "default",
    ()=>StockPage,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$service$2d$container$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/service-container.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/types.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$stock$2f$stock$2d$table$2e$client$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/dashboard/stock/stock-table.client.tsx [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$service$2d$container$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$service$2d$container$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
const dynamic = "force-dynamic";
async function StockPage({ searchParams }) {
    const params = await searchParams;
    const rawStatus = typeof params.status === "string" ? params.status : "TODOS";
    const rawSearch = typeof params.search === "string" ? params.search : undefined;
    const rawPage = typeof params.page === "string" ? params.page : "1";
    const rawPageSize = typeof params.pageSize === "string" ? params.pageSize : "50";
    const filterInput = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StockReportFilterSchema"].parse({
        status: rawStatus,
        search: rawSearch,
        page: rawPage,
        pageSize: rawPageSize
    });
    const stockService = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$service$2d$container$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getStockReconciliationService"])();
    const report = await stockService.getPaginatedReconciliationReport(filterInput);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "max-w-7xl mx-auto space-y-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-2xl font-bold tracking-tight text-slate-900",
                        children: "Tablero de Inventario y Quiebres"
                    }, void 0, false, {
                        fileName: "[project]/src/app/dashboard/stock/page.tsx",
                        lineNumber: 32,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-slate-600 mt-1",
                        children: "Visualización en tiempo real del estado de stock cruzado con proveedores y cálculo determinista."
                    }, void 0, false, {
                        fileName: "[project]/src/app/dashboard/stock/page.tsx",
                        lineNumber: 35,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/dashboard/stock/page.tsx",
                lineNumber: 31,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$stock$2f$stock$2d$table$2e$client$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StockTableClient"], {
                report: report,
                currentStatus: filterInput.status,
                currentSearch: filterInput.search ?? ""
            }, void 0, false, {
                fileName: "[project]/src/app/dashboard/stock/page.tsx",
                lineNumber: 40,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/dashboard/stock/page.tsx",
        lineNumber: 30,
        columnNumber: 5
    }, this);
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/app/dashboard/stock/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", (function(__turbopack_context__){

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/dashboard/stock/page.tsx [app-rsc] (ecmascript)"));
}),
"[project]/src/app/dashboard/stock/stock-table.client.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "StockTableClient",
    ()=>StockTableClient
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const StockTableClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call StockTableClient() from the server but StockTableClient is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/app/dashboard/stock/stock-table.client.tsx", "StockTableClient");
}),
"[project]/src/app/dashboard/stock/stock-table.client.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "StockTableClient",
    ()=>StockTableClient
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const StockTableClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call StockTableClient() from the server but StockTableClient is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/app/dashboard/stock/stock-table.client.tsx <module evaluation>", "StockTableClient");
}),
"[project]/src/app/dashboard/stock/stock-table.client.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$stock$2f$stock$2d$table$2e$client$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/src/app/dashboard/stock/stock-table.client.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$stock$2f$stock$2d$table$2e$client$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/src/app/dashboard/stock/stock-table.client.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$stock$2f$stock$2d$table$2e$client$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/src/concurrency.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Mapea una colección de elementos de forma concurrente con un límite acotado de tareas simultáneas.
 *
 * @param items - Lista de elementos a procesar.
 * @param limit - Cantidad máxima de ejecuciones asíncronas en paralelo.
 * @param task - Función asíncrona que procesa cada elemento.
 * @returns Promesa que resuelve la lista de resultados preservando el orden original.
 */ __turbopack_context__.s([
    "mapConcurrent",
    ()=>mapConcurrent
]);
async function mapConcurrent(items, limit, task) {
    if (limit <= 0) {
        throw new Error("El límite de concurrencia debe ser mayor a 0");
    }
    if (items.length === 0) {
        return [];
    }
    const results = new Array(items.length);
    let currentIndex = 0;
    async function worker() {
        while(currentIndex < items.length){
            const index = currentIndex++;
            results[index] = await task(items[index]);
        }
    }
    const workerCount = Math.min(limit, items.length);
    const workers = Array.from({
        length: workerCount
    }, ()=>worker());
    await Promise.all(workers);
    return results;
}
}),
"[project]/src/config.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EnvironmentSchema",
    ()=>EnvironmentSchema,
    "loadConfig",
    ()=>loadConfig
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v3/external.js [app-rsc] (ecmascript) <export * as z>");
;
const EnvironmentSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    DATABASE_URL: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().url("DATABASE_URL debe ser una URI válida de conexión PostgreSQL"),
    AI_GATEWAY_API_KEY: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, "AI_GATEWAY_API_KEY es obligatoria para la comunicación con Vercel AI Gateway"),
    JEV_MODEL_ID: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1).default("typesafe-ai/jev"),
    BATCH_SIZE: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].coerce.number().int().positive("BATCH_SIZE debe ser un entero positivo").default(50),
    MAX_CONCURRENCY: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].coerce.number().int().positive("MAX_CONCURRENCY debe ser un entero positivo").default(5),
    PG_TRGM_THRESHOLD: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].coerce.number().min(0.0).max(1.0, "PG_TRGM_THRESHOLD debe encontrarse en el rango [0.0, 1.0]").default(0.60),
    CONFIRMED_MATCH_THRESHOLD: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].coerce.number().min(0.0).max(1.0, "CONFIRMED_MATCH_THRESHOLD debe encontrarse en el rango [0.0, 1.0]").default(0.90),
    REVIEW_MATCH_THRESHOLD: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].coerce.number().min(0.0).max(1.0, "REVIEW_MATCH_THRESHOLD debe encontrarse en el rango [0.0, 1.0]").default(0.70)
}).refine((data)=>data.CONFIRMED_MATCH_THRESHOLD > data.REVIEW_MATCH_THRESHOLD, {
    message: "CONFIRMED_MATCH_THRESHOLD debe ser estrictamente mayor que REVIEW_MATCH_THRESHOLD",
    path: [
        "CONFIRMED_MATCH_THRESHOLD"
    ]
});
function loadConfig(env = process.env) {
    const result = EnvironmentSchema.safeParse(env);
    if (!result.success) {
        const errorDetails = result.error.errors.map((err)=>`${err.path.join(".")}: ${err.message}`).join(", ");
        throw new Error(`Configuración de entorno inválida: ${errorDetails}`);
    }
    return result.data;
}
}),
"[project]/src/ingestion/catalog-ingestion.service.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CatalogIngestionService",
    ()=>CatalogIngestionService
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$sku$2d$normalizer$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/sku-normalizer.ts [app-rsc] (ecmascript)");
;
class CatalogIngestionService {
    extractor;
    repository;
    constructor(extractor, repository){
        this.extractor = extractor;
        this.repository = repository;
    }
    async processCatalogPdf(buffer, target) {
        const startTime = performance.now();
        const { items, totalPages } = await this.extractor.extractItems(buffer);
        let discardedCount = 0;
        if (target === "CLIENT") {
            const clientMap = new Map();
            for (const item of items){
                const normalizedSku = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$sku$2d$normalizer$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["normalizeSku"])(item.rawSku);
                const sanitizedName = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$sku$2d$normalizer$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sanitizeProductName"])(item.rawName);
                if (!normalizedSku || !sanitizedName) {
                    discardedCount++;
                    continue;
                }
                const rawSku = item.rawSku.trim();
                clientMap.set(rawSku, {
                    sku: rawSku,
                    normalizedSku,
                    name: sanitizedName
                });
            }
            const clientItems = Array.from(clientMap.values());
            const persistedCount = await this.repository.bulkUpsertClientProducts(clientItems);
            const executionTimeMs = Math.round(performance.now() - startTime);
            return {
                target,
                totalPages,
                extractedCount: items.length,
                persistedCount,
                discardedCount,
                executionTimeMs
            };
        } else {
            const supplierMap = new Map();
            for (const item of items){
                const normalizedSku = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$sku$2d$normalizer$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["normalizeSku"])(item.rawSku);
                const sanitizedName = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$sku$2d$normalizer$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sanitizeProductName"])(item.rawName);
                if (!normalizedSku || !sanitizedName) {
                    discardedCount++;
                    continue;
                }
                const rawSku = item.rawSku.trim();
                supplierMap.set(rawSku, {
                    sku: rawSku,
                    normalizedSku,
                    name: sanitizedName,
                    currentStock: Math.max(0, item.stock ?? 0)
                });
            }
            const supplierItems = Array.from(supplierMap.values());
            const persistedCount = await this.repository.bulkUpsertSupplierProducts(supplierItems);
            const executionTimeMs = Math.round(performance.now() - startTime);
            return {
                target,
                totalPages,
                extractedCount: items.length,
                persistedCount,
                discardedCount,
                executionTimeMs
            };
        }
    }
}
}),
"[project]/src/ingestion/unpdf-extractor.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "UnpdfExtractor",
    ()=>UnpdfExtractor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$unpdf$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/unpdf/dist/index.mjs [app-rsc] (ecmascript)");
;
class UnpdfExtractor {
    async extractItems(pdfBuffer) {
        if (!pdfBuffer || pdfBuffer.byteLength === 0) {
            throw new Error("El buffer del PDF no puede estar vacío");
        }
        let pdfProxy;
        try {
            pdfProxy = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$unpdf$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDocumentProxy"])(new Uint8Array(pdfBuffer));
        } catch (error) {
            throw new Error(`Fallo al leer la estructura del PDF: ${error.message}`);
        }
        const { totalPages, text: pageTexts } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$unpdf$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["extractText"])(pdfProxy, {
            mergePages: false
        });
        const items = [];
        const pages = Array.isArray(pageTexts) ? pageTexts : [
            pageTexts
        ];
        for (const pageText of pages){
            const lines = pageText.split(/\r?\n/);
            for (const rawLine of lines){
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
        return {
            items,
            totalPages
        };
    }
    isHeaderOrNoise(line) {
        const lower = line.toLowerCase();
        if (lower.startsWith("página") || lower.startsWith("pagina") || lower.startsWith("page ") || lower.startsWith("fecha:") || lower.startsWith("usuario:") || lower.startsWith("tlf:") || lower.startsWith("calle ") || lower.startsWith("autorepuestos") || lower.startsWith("lista de precios") || lower.includes("r.i.f") || /^\d{2}\/\d{2}\/\d{4}/.test(line) || /^(sku|código|codigo|referencia|ref|item|cód|cod)(?:[\t|;]|\s{2,}|\s+(?:desc|nom|art|prod|cant|stock|prec|total))/i.test(line) || /^={3,}|^---/.test(line)) {
            return true;
        }
        return false;
    }
    parseLine(line) {
        // 1. Estrategia A: Delimitadores explícitos (\t, |, ;, o 2+ espacios)
        const sep = "(?:\\t|\\||;|\\s{2,})";
        const pattern = new RegExp(`^\\s*(?<sku>[A-Za-z0-9\\-_\\.\\/]{2,})\\s*${sep}\\s*(?<name>.+?)(?:\\s*${sep}\\s*(?<stock>\\d+))?\\s*$`);
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
        const priceWithStockPattern = /^\s*(?<sku>[A-Za-z0-9][A-Za-z0-9\-_./]{1,})\s+(?<name>.+?)\s+(?<stock>\d+)\s+(?:Bs\.?|USD|\$|EUR|€)\s*[\d.,]+(?:\s+(?:Bs\.?|USD|\$|EUR|€)\s*[\d.,]+)*\s*$/i;
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
}),
"[project]/src/jev-matcher.service.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "JevSystemOneMatcher",
    ()=>JevSystemOneMatcher
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/ai/dist/index.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/types.ts [app-rsc] (ecmascript)");
;
;
const evaluate = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["experimental_evaluate"] ?? (async ()=>({}));
class JevSystemOneMatcher {
    modelId;
    maxRetries;
    initialDelayMs;
    constructor(modelId, maxRetries = 3, initialDelayMs = 400){
        this.modelId = modelId;
        this.maxRetries = maxRetries;
        this.initialDelayMs = initialDelayMs;
        if (!modelId) {
            throw new Error("modelId es obligatorio para inicializar JevSystemOneMatcher");
        }
    }
    async evaluateMatch(clientProduct, candidate) {
        const statePayload = JSON.stringify({
            clientProduct: {
                sku: clientProduct.sku,
                name: clientProduct.name
            },
            supplierCandidate: {
                sku: candidate.sku,
                name: candidate.name,
                lexicalSimilarityScore: candidate.similarityScore
            }
        });
        let attempt = 0;
        while(attempt < this.maxRetries){
            try {
                const rawEvaluation = await evaluate({
                    model: this.modelId,
                    state: statePayload,
                    questions: {
                        isMatch: {
                            type: "boolean",
                            instructions: "Determina si ambos registros corresponden al mismo producto fisico y comercial exacto."
                        },
                        confidenceScore: {
                            type: "number",
                            instructions: "Nivel de certeza de la inferencia, escala normalizada 0.0 a 1.0."
                        },
                        matchType: {
                            type: "string",
                            instructions: "Clasifica: EXACT_CODE, EQUIVALENT_VARIANT o DIFFERENT_PRODUCT."
                        },
                        discrepancyReason: {
                            type: "string",
                            instructions: "Clasifica discrepancia: NONE, PACKAGING_DIFFERENCE, SPECIFICATION_MISMATCH, BRAND_MISMATCH o VARIANT_MISMATCH."
                        }
                    }
                });
                const validation = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ProductMatchResultSchema"].safeParse(rawEvaluation);
                if (!validation.success) {
                    throw new Error(`Contrato de tipos violado por la salida del evaluador: ${validation.error.message}`);
                }
                return validation.data;
            } catch (error) {
                attempt++;
                if (attempt >= this.maxRetries) {
                    throw new Error(`Fallo de inferencia Jev tras ${this.maxRetries} intentos: ${error.message}`);
                }
                const delay = this.initialDelayMs * Math.pow(2, attempt) + Math.random() * 100;
                await new Promise((res)=>setTimeout(res, delay));
            }
        }
        throw new Error("Estado inalcanzable en evaluador Jev.");
    }
}
}),
"[project]/src/lib/service-container.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "getCatalogIngestionService",
    ()=>getCatalogIngestionService,
    "getDbPool",
    ()=>getDbPool,
    "getProductRepository",
    ()=>getProductRepository,
    "getReconciliationWorker",
    ()=>getReconciliationWorker,
    "getStockReconciliationService",
    ()=>getStockReconciliationService
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__ = __turbopack_context__.i("[externals]/pg [external] (pg, esm_import, [project]/node_modules/pg)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/config.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$product$2e$repository$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/product.repository.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$jev$2d$matcher$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/jev-matcher.service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$reconciliation$2e$worker$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/reconciliation.worker.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$stock$2d$reconciliation$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/stock-reconciliation.service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$ingestion$2f$unpdf$2d$extractor$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/ingestion/unpdf-extractor.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$ingestion$2f$catalog$2d$ingestion$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/ingestion/catalog-ingestion.service.ts [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
;
;
;
;
let poolInstance = null;
function getDbPool() {
    if (!poolInstance) {
        const config = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadConfig"])();
        poolInstance = new __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__["Pool"]({
            connectionString: config.DATABASE_URL,
            max: config.MAX_CONCURRENCY + 2
        });
    }
    return poolInstance;
}
function getProductRepository() {
    return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$product$2e$repository$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PostgresProductRepository"](getDbPool());
}
function getCatalogIngestionService() {
    const repo = getProductRepository();
    const extractor = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$ingestion$2f$unpdf$2d$extractor$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["UnpdfExtractor"]();
    return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$ingestion$2f$catalog$2d$ingestion$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CatalogIngestionService"](extractor, repo);
}
function getReconciliationWorker() {
    const config = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadConfig"])();
    const repo = getProductRepository();
    const matcher = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$jev$2d$matcher$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["JevSystemOneMatcher"](config.JEV_MODEL_ID);
    return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$reconciliation$2e$worker$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CatalogReconciliationWorker"](repo, matcher, config);
}
function getStockReconciliationService() {
    return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$stock$2d$reconciliation$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PostgresStockReconciliationService"](getDbPool());
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/product.repository.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PostgresProductRepository",
    ()=>PostgresProductRepository
]);
class PostgresProductRepository {
    pool;
    constructor(pool){
        this.pool = pool;
    }
    async getUnmappedClientProducts(limit) {
        const query = `
      SELECT 
        c.id, 
        c.sku, 
        c.normalized_sku AS "normalizedSku", 
        c.name,
        c.created_at AS "createdAt"
      FROM client_products c
      WHERE NOT EXISTS (
        SELECT 1 FROM product_mappings m 
        WHERE m.client_sku = c.sku
      )
      LIMIT $1;
    `;
        const result = await this.pool.query(query, [
            limit
        ]);
        return result.rows;
    }
    async findSupplierCandidates(clientProductName, similarityThreshold, limit, clientNormalizedSku) {
        // Adquisición de cliente dedicado para encapsulación transaccional estricta
        const client = await this.pool.connect();
        try {
            await client.query("BEGIN;");
            // set_config con is_local = true (SET LOCAL) para evitar polución del pool
            await client.query("SELECT set_config('pg_trgm.similarity_threshold', $1::text, true);", [
                similarityThreshold.toString()
            ]);
            let query;
            let params;
            if (clientNormalizedSku && clientNormalizedSku.trim().length > 0) {
                query = `
          SELECT 
            s.sku,
            s.normalized_sku AS "normalizedSku",
            s.name,
            CASE 
              WHEN s.normalized_sku = $3 THEN 1.0
              ELSE similarity(s.name, $1)
            END AS "similarityScore"
          FROM supplier_products s
          WHERE s.normalized_sku = $3 OR s.name % $1
          ORDER BY 
            (s.normalized_sku = $3) DESC,
            "similarityScore" DESC
          LIMIT $2;
        `;
                params = [
                    clientProductName,
                    limit,
                    clientNormalizedSku.trim()
                ];
            } else {
                query = `
          SELECT 
            s.sku,
            s.normalized_sku AS "normalizedSku",
            s.name,
            similarity(s.name, $1) AS "similarityScore"
          FROM supplier_products s
          WHERE s.name % $1
          ORDER BY "similarityScore" DESC
          LIMIT $2;
        `;
                params = [
                    clientProductName,
                    limit
                ];
            }
            const result = await client.query(query, params);
            await client.query("COMMIT;");
            return result.rows;
        } catch (error) {
            await client.query("ROLLBACK;");
            throw error;
        } finally{
            // Liberación garantizada de la conexión al pool
            client.release();
        }
    }
    async saveMapping(record) {
        const queryPair = `
      INSERT INTO product_mappings (
        client_sku, 
        supplier_sku, 
        confidence_score, 
        status, 
        discrepancy_reason,
        reviewed_by,
        reviewed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (client_sku, supplier_sku) WHERE supplier_sku IS NOT NULL
      DO UPDATE SET
        confidence_score = EXCLUDED.confidence_score,
        status = EXCLUDED.status,
        discrepancy_reason = EXCLUDED.discrepancy_reason,
        updated_at = CURRENT_TIMESTAMP;
    `;
        const queryOrphan = `
      INSERT INTO product_mappings (
        client_sku, 
        supplier_sku, 
        confidence_score, 
        status, 
        discrepancy_reason
      ) VALUES ($1, NULL, $2, $3, $4)
      ON CONFLICT (client_sku) WHERE supplier_sku IS NULL
      DO UPDATE SET
        confidence_score = EXCLUDED.confidence_score,
        status = EXCLUDED.status,
        discrepancy_reason = EXCLUDED.discrepancy_reason,
        updated_at = CURRENT_TIMESTAMP;
    `;
        if (record.supplierSku !== null) {
            await this.pool.query(queryPair, [
                record.clientSku,
                record.supplierSku,
                record.confidenceScore,
                record.status,
                record.discrepancyReason,
                record.reviewedBy ?? null,
                record.reviewedAt ?? null
            ]);
        } else {
            await this.pool.query(queryOrphan, [
                record.clientSku,
                record.confidenceScore,
                record.status,
                record.discrepancyReason
            ]);
        }
    }
    async getPendingReviews(limit) {
        const query = `
      SELECT 
        client_sku AS "clientSku",
        supplier_sku AS "supplierSku",
        confidence_score AS "confidenceScore",
        status,
        discrepancy_reason AS "discrepancyReason",
        reviewed_by AS "reviewedBy",
        reviewed_at AS "reviewedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM product_mappings
      WHERE status = 'REQUIRES_REVIEW'
      ORDER BY created_at ASC
      LIMIT $1;
    `;
        const result = await this.pool.query(query, [
            limit
        ]);
        return result.rows;
    }
    async getAuditItemsView(limit) {
        const query = `
      SELECT 
        pm.id::text AS id,
        pm.client_sku AS "clientSku",
        cp.name AS "clientProductName",
        pm.supplier_sku AS "supplierSku",
        sp.name AS "supplierProductName",
        CAST(pm.confidence_score AS FLOAT) AS "confidenceScore",
        pm.status AS status,
        pm.discrepancy_reason AS "discrepancyReason",
        pm.created_at AS "createdAt"
      FROM product_mappings pm
      JOIN client_products cp ON cp.sku = pm.client_sku
      LEFT JOIN supplier_products sp ON sp.sku = pm.supplier_sku
      WHERE pm.status = 'REQUIRES_REVIEW'
      ORDER BY pm.created_at ASC
      LIMIT $1;
    `;
        const result = await this.pool.query(query, [
            limit
        ]);
        return result.rows;
    }
    async resolveAuditReview(clientSku, statusOrSupplierSku, statusOrReviewer, maybeReviewer) {
        let supplierSku;
        let status;
        let reviewer;
        if (maybeReviewer !== undefined) {
            supplierSku = statusOrSupplierSku;
            status = statusOrReviewer;
            reviewer = maybeReviewer;
        } else {
            status = statusOrSupplierSku;
            reviewer = statusOrReviewer;
        }
        if (!reviewer || reviewer.trim().length === 0) {
            throw new Error("El identificador del revisor es obligatorio para la auditoría");
        }
        if (supplierSku !== undefined && supplierSku !== null) {
            const query = `
        UPDATE product_mappings
        SET 
          status = $1,
          reviewed_by = $2,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE client_sku = $3 AND (supplier_sku = $4 OR supplier_sku IS NULL) AND status = 'REQUIRES_REVIEW';
      `;
            await this.pool.query(query, [
                status,
                reviewer.trim(),
                clientSku,
                supplierSku
            ]);
        } else {
            const query = `
        UPDATE product_mappings
        SET 
          status = $1,
          reviewed_by = $2,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE client_sku = $3 AND status = 'REQUIRES_REVIEW';
      `;
            await this.pool.query(query, [
                status,
                reviewer.trim(),
                clientSku
            ]);
        }
    }
    async bulkUpsertClientProducts(items) {
        if (items.length === 0) {
            return 0;
        }
        const client = await this.pool.connect();
        try {
            await client.query("BEGIN;");
            const chunkSize = 200;
            let totalPersisted = 0;
            for(let i = 0; i < items.length; i += chunkSize){
                const chunk = items.slice(i, i + chunkSize);
                const values = [];
                const rowPlaceholders = [];
                chunk.forEach((item, idx)=>{
                    const offset = idx * 3;
                    rowPlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3})`);
                    values.push(item.sku, item.normalizedSku, item.name);
                });
                const query = `
          INSERT INTO client_products (sku, normalized_sku, name)
          VALUES ${rowPlaceholders.join(", ")}
          ON CONFLICT (sku) DO UPDATE SET
            normalized_sku = EXCLUDED.normalized_sku,
            name = EXCLUDED.name;
        `;
                const result = await client.query(query, values);
                totalPersisted += result.rowCount ?? chunk.length;
            }
            await client.query("COMMIT;");
            return totalPersisted;
        } catch (error) {
            await client.query("ROLLBACK;");
            throw error;
        } finally{
            client.release();
        }
    }
    async bulkUpsertSupplierProducts(items) {
        if (items.length === 0) {
            return 0;
        }
        const client = await this.pool.connect();
        try {
            await client.query("BEGIN;");
            const chunkSize = 200;
            let totalPersisted = 0;
            for(let i = 0; i < items.length; i += chunkSize){
                const chunk = items.slice(i, i + chunkSize);
                const values = [];
                const rowPlaceholders = [];
                chunk.forEach((item, idx)=>{
                    const offset = idx * 4;
                    rowPlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
                    values.push(item.sku, item.normalizedSku, item.name, item.currentStock);
                });
                const query = `
          INSERT INTO supplier_products (sku, normalized_sku, name, current_stock)
          VALUES ${rowPlaceholders.join(", ")}
          ON CONFLICT (sku) DO UPDATE SET
            normalized_sku = EXCLUDED.normalized_sku,
            name = EXCLUDED.name,
            current_stock = EXCLUDED.current_stock,
            updated_at = CURRENT_TIMESTAMP;
        `;
                const result = await client.query(query, values);
                totalPersisted += result.rowCount ?? chunk.length;
            }
            await client.query("COMMIT;");
            return totalPersisted;
        } catch (error) {
            await client.query("ROLLBACK;");
            throw error;
        } finally{
            client.release();
        }
    }
}
}),
"[project]/src/reconciliation.worker.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CatalogReconciliationWorker",
    ()=>CatalogReconciliationWorker
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$concurrency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/concurrency.ts [app-rsc] (ecmascript)");
;
class CatalogReconciliationWorker {
    repository;
    aiMatcher;
    config;
    constructor(repository, aiMatcher, config){
        this.repository = repository;
        this.aiMatcher = aiMatcher;
        this.config = config;
    }
    /**
   * Ejecuta un lote de conciliación procesando productos pendientes de forma concurrente acotada.
   */ async runBatch() {
        const unmappedProducts = await this.repository.getUnmappedClientProducts(this.config.BATCH_SIZE);
        if (unmappedProducts.length === 0) {
            return {
                processed: 0,
                resolved: 0
            };
        }
        let resolvedCount = 0;
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$concurrency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["mapConcurrent"])(unmappedProducts, this.config.MAX_CONCURRENCY, async (clientProduct)=>{
            const wasResolved = await this.processProduct(clientProduct);
            if (wasResolved) {
                resolvedCount++;
            }
        });
        return {
            processed: unmappedProducts.length,
            resolved: resolvedCount
        };
    }
    /**
   * Procesa un producto individualmente a través de bloqueo léxico pg_trgm e inferencia con Jev.
   */ async processProduct(product) {
        const candidates = await this.repository.findSupplierCandidates(product.name, this.config.PG_TRGM_THRESHOLD, 3, product.normalizedSku);
        // Caso Huérfano: 0 candidatos superaron el umbral léxico
        if (candidates.length === 0) {
            const orphanMapping = {
                clientSku: product.sku,
                supplierSku: null,
                confidenceScore: 0.0,
                status: "REJECTED",
                discrepancyReason: "NO_CANDIDATES_FOUND"
            };
            await this.repository.saveMapping(orphanMapping);
            return false;
        }
        let matched = false;
        for (const candidate of candidates){
            try {
                let evaluation;
                if (product.sku.trim().toUpperCase() === candidate.sku.trim().toUpperCase() || Boolean(product.normalizedSku) && product.normalizedSku === candidate.normalizedSku) {
                    evaluation = {
                        isMatch: true,
                        confidenceScore: 1.0,
                        matchType: "EXACT_CODE",
                        discrepancyReason: "NONE"
                    };
                } else {
                    evaluation = await this.aiMatcher.evaluateMatch(product, candidate);
                }
                if (!evaluation.isMatch) {
                    continue;
                }
                const status = evaluation.confidenceScore >= this.config.CONFIRMED_MATCH_THRESHOLD ? "CONFIRMED" : evaluation.confidenceScore >= this.config.REVIEW_MATCH_THRESHOLD ? "REQUIRES_REVIEW" : "REJECTED";
                if (status === "REJECTED") {
                    continue;
                }
                const mapping = {
                    clientSku: product.sku,
                    supplierSku: candidate.sku,
                    confidenceScore: evaluation.confidenceScore,
                    status,
                    discrepancyReason: evaluation.discrepancyReason
                };
                await this.repository.saveMapping(mapping);
                matched = true;
                break;
            } catch (error) {
                process.stderr.write(`Error en inferencia para ${product.sku} vs ${candidate.sku}: ${error.message}\n`);
            }
        }
        // Si ningún candidato fue confirmado o puesto en revisión, se persiste como REJECTED
        if (!matched) {
            const rejectedMapping = {
                clientSku: product.sku,
                supplierSku: null,
                confidenceScore: 0.0,
                status: "REJECTED",
                discrepancyReason: "NO_CANDIDATES_FOUND"
            };
            await this.repository.saveMapping(rejectedMapping);
        }
        return matched;
    }
}
}),
"[project]/src/sku-normalizer.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Sanitiza y normaliza un SKU removiendo todo caracter que no sea alfanumérico
 * y transformando el resultado a mayúsculas.
 *
 * @param rawSku - Código SKU original provisto en la ingesta.
 * @returns Cadena normalizada alfanumérica en mayúsculas sin espacios ni símbolos.
 */ __turbopack_context__.s([
    "normalizeSku",
    ()=>normalizeSku,
    "sanitizeProductName",
    ()=>sanitizeProductName
]);
function normalizeSku(rawSku) {
    if (typeof rawSku !== "string") {
        throw new TypeError("rawSku debe ser una cadena de texto");
    }
    return rawSku.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
function sanitizeProductName(rawName) {
    if (typeof rawName !== "string") {
        throw new TypeError("rawName debe ser una cadena de texto");
    }
    return rawName.trim().replace(/\s+/g, " ");
}
}),
"[project]/src/stock-reconciliation.service.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PostgresStockReconciliationService",
    ()=>PostgresStockReconciliationService
]);
class PostgresStockReconciliationService {
    pool;
    constructor(pool){
        this.pool = pool;
    }
    async getReconciledStock() {
        const query = `
      SELECT 
        c.sku AS "clientSku",
        c.name AS "clientProductName",
        s.sku AS "supplierSku",
        COALESCE(s.current_stock, 0) AS "supplierStock",
        CASE 
          WHEN m.supplier_sku IS NULL THEN 'NO_CATALOGADO'
          WHEN s.sku IS NULL THEN 'DESCATALOGADO_PROVEEDOR'
          WHEN s.current_stock = 0 THEN 'AGOTADO'
          ELSE 'DISPONIBLE'
        END AS "stockStatus"
      FROM client_products c
      LEFT JOIN product_mappings m 
        ON m.client_sku = c.sku AND m.status = 'CONFIRMED'
      LEFT JOIN supplier_products s 
        ON s.sku = m.supplier_sku;
    `;
        const result = await this.pool.query(query);
        return result.rows;
    }
    async getPaginatedReconciliationReport(filters) {
        const page = Math.max(1, filters.page ?? 1);
        const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50));
        const offset = (page - 1) * pageSize;
        const baseCte = `
      WITH base_stock AS (
        SELECT 
          c.sku AS "clientSku",
          c.name AS "clientProductName",
          s.sku AS "supplierSku",
          COALESCE(s.current_stock, 0)::int AS "supplierStock",
          CASE 
            WHEN m.supplier_sku IS NULL THEN 'NO_CATALOGADO'
            WHEN s.sku IS NULL THEN 'DESCATALOGADO_PROVEEDOR'
            WHEN s.current_stock = 0 THEN 'AGOTADO'
            ELSE 'DISPONIBLE'
          END AS "stockStatus"
        FROM client_products c
        LEFT JOIN product_mappings m 
          ON m.client_sku = c.sku AND m.status = 'CONFIRMED'
        LEFT JOIN supplier_products s 
          ON s.sku = m.supplier_sku
      )
    `;
        const metricsResult = await this.pool.query(`
      ${baseCte}
      SELECT 
        COUNT(*)::int AS "totalProducts",
        COUNT(*) FILTER (WHERE "stockStatus" = 'DISPONIBLE')::int AS "availableCount",
        COUNT(*) FILTER (WHERE "stockStatus" = 'AGOTADO')::int AS "outOfStockCount",
        COUNT(*) FILTER (WHERE "stockStatus" = 'DESCATALOGADO_PROVEEDOR')::int AS "discontinuedCount",
        COUNT(*) FILTER (WHERE "stockStatus" = 'NO_CATALOGADO')::int AS "unmappedCount"
      FROM base_stock;
    `);
        const metricsRow = metricsResult.rows[0] ?? {
            totalProducts: 0,
            availableCount: 0,
            outOfStockCount: 0,
            discontinuedCount: 0,
            unmappedCount: 0
        };
        const conditions = [];
        const values = [];
        let paramIndex = 1;
        if (filters.status && filters.status !== "TODOS") {
            conditions.push(`"stockStatus" = $${paramIndex++}`);
            values.push(filters.status);
        }
        if (filters.search && filters.search.trim().length > 0) {
            conditions.push(`("clientSku" ILIKE $${paramIndex} OR "clientProductName" ILIKE $${paramIndex})`);
            values.push(`%${filters.search.trim()}%`);
            paramIndex++;
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const countResult = await this.pool.query(`
        ${baseCte}
        SELECT COUNT(*)::int AS total
        FROM base_stock
        ${whereClause};
      `, values);
        const totalItems = countResult.rows[0]?.total ?? 0;
        const totalPages = Math.ceil(totalItems / pageSize) || 1;
        const itemsValues = [
            ...values,
            pageSize,
            offset
        ];
        const itemsResult = await this.pool.query(`
        ${baseCte}
        SELECT 
          "clientSku",
          "clientProductName",
          "supplierSku",
          "supplierStock",
          "stockStatus"
        FROM base_stock
        ${whereClause}
        ORDER BY "clientSku" ASC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++};
      `, itemsValues);
        return {
            items: itemsResult.rows,
            pagination: {
                currentPage: page,
                pageSize,
                totalItems,
                totalPages
            },
            metrics: {
                totalProducts: Number(metricsRow.totalProducts),
                availableCount: Number(metricsRow.availableCount),
                outOfStockCount: Number(metricsRow.outOfStockCount),
                discontinuedCount: Number(metricsRow.discontinuedCount),
                unmappedCount: Number(metricsRow.unmappedCount)
            }
        };
    }
}
}),
"[project]/src/types.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CatalogTargetSchema",
    ()=>CatalogTargetSchema,
    "ExtractedCatalogItemSchema",
    ()=>ExtractedCatalogItemSchema,
    "IngestionSummarySchema",
    ()=>IngestionSummarySchema,
    "ProductMatchResultSchema",
    ()=>ProductMatchResultSchema,
    "ResolveReviewActionSchema",
    ()=>ResolveReviewActionSchema,
    "StockReportFilterSchema",
    ()=>StockReportFilterSchema,
    "UploadCatalogSchema",
    ()=>UploadCatalogSchema
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v3/external.js [app-rsc] (ecmascript) <export * as z>");
;
const ProductMatchResultSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    isMatch: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().describe("Indica si ambos registros corresponden al mismo producto comercial."),
    confidenceScore: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0.0).max(1.0).describe("Nivel de certeza de la inferencia, normalizado de 0.0 a 1.0."),
    matchType: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "EXACT_CODE",
        "EQUIVALENT_VARIANT",
        "DIFFERENT_PRODUCT"
    ]).describe("Clasificación de equivalencia entre ambos productos."),
    discrepancyReason: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "NONE",
        "PACKAGING_DIFFERENCE",
        "SPECIFICATION_MISMATCH",
        "BRAND_MISMATCH",
        "VARIANT_MISMATCH",
        "NO_CANDIDATES_FOUND"
    ]).describe("Causal formal de la discrepancia identificada.")
});
const CatalogTargetSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    "CLIENT",
    "SUPPLIER"
]);
const ExtractedCatalogItemSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    rawSku: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1).describe("Código o referencia original detectada en el documento."),
    rawName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1).describe("Descripción o denominación del producto."),
    stock: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().nonnegative().optional().default(0).describe("Cantidad en existencia (aplica prioritariamente a proveedores).")
});
const IngestionSummarySchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    target: CatalogTargetSchema,
    totalPages: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().nonnegative(),
    extractedCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().nonnegative(),
    persistedCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().nonnegative(),
    discardedCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().nonnegative(),
    executionTimeMs: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().nonnegative()
});
const UploadCatalogSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    target: CatalogTargetSchema,
    file: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].custom((val)=>typeof File !== "undefined" && val instanceof File, "Se requiere un archivo válido.").refine((file)=>typeof file === "object" && file !== null && "size" in file && file.size > 0, "El archivo no puede estar vacío.").refine((file)=>typeof file === "object" && file !== null && "size" in file && file.size <= 25 * 1024 * 1024, "El tamaño del archivo no puede exceder 25 MB.").refine((file)=>typeof file === "object" && file !== null && "type" in file && "name" in file && (file.type === "application/pdf" || file.name.endsWith(".pdf")), "Solo se admiten documentos en formato PDF.")
});
const ResolveReviewActionSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    clientSku: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, "El SKU de cliente es obligatorio."),
    supplierSku: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable().optional(),
    resolution: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "CONFIRMED",
        "REJECTED"
    ]),
    reviewer: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, "El identificador del revisor es obligatorio.")
});
const StockReportFilterSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "TODOS",
        "DISPONIBLE",
        "AGOTADO",
        "DESCATALOGADO_PROVEEDOR",
        "NO_CATALOGADO"
    ]).default("TODOS"),
    search: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    page: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].coerce.number().int().positive().default(1),
    pageSize: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].coerce.number().int().positive().max(100).default(50)
});
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0p5rzva._.js.map