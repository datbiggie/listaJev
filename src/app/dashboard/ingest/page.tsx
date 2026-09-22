"use client";

import { useState, useActionState, useRef, type DragEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { ingestCatalogAction } from "@/actions/ingest-catalog.action";
import { ActionResult, CatalogTarget, IngestionSummary } from "@/types";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export default function IngestPage() {
  const [target, setTarget] = useState<CatalogTarget>("CLIENT");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [state, formAction, isPending] = useActionState<
    ActionResult<IngestionSummary> | null,
    FormData
  >(ingestCatalogAction, null);

  const validateAndSetFile = (file: File) => {
    setClientError(null);
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setClientError("Solo se admiten documentos en formato PDF.");
      setSelectedFile(null);
      return false;
    }
    if (file.size <= 0) {
      setClientError("El archivo no puede estar vacío.");
      setSelectedFile(null);
      return false;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setClientError("El tamaño del archivo no puede exceder 25 MB.");
      setSelectedFile(null);
      return false;
    }
    setSelectedFile(file);
    return true;
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const valid = validateAndSetFile(file);
      if (valid && fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInputRef.current.files = dataTransfer.files;
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleResetForNextCatalog = () => {
    setTarget("SUPPLIER");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isClientTarget = target === "CLIENT";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Centro de Ingesta y Carga de Catálogos
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Extracción automatizada, normalización y persistencia transaccional de catálogos en PDF.
        </p>
      </div>

      <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs space-y-2">
        <p className="font-semibold text-white tracking-wide uppercase">
          Flujo de Trabajo Operativo Recomendado:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
            <span className="font-bold text-blue-400">Paso 1: Catálogo Cliente</span>
            <p className="text-slate-300 mt-1">
              Cargue el PDF del cliente para registrar la base de referencia (client_products).
            </p>
          </div>
          <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
            <span className="font-bold text-amber-400">Paso 2: Lista Proveedor</span>
            <p className="text-slate-300 mt-1">
              Cargue el PDF del proveedor con inventario y precios (supplier_products).
            </p>
          </div>
          <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
            <span className="font-bold text-emerald-400">Paso 3: Conciliación</span>
            <p className="text-slate-300 mt-1">
              Ejecute la reconciliación en la Bandeja de Auditoría para cruzar existencias.
            </p>
          </div>
        </div>
      </div>

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="target" value={target} />

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-slate-900">
                Paso 1: Seleccione el Tipo de Catálogo a Cargar
              </label>
              <span className="text-xs font-mono text-slate-500">
                Tabla de destino: <strong className="text-blue-700">{isClientTarget ? "client_products" : "supplier_products"}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setTarget("CLIENT");
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                  isClientTarget
                    ? "border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                    Opción A
                  </span>
                  {isClientTarget && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                      Seleccionado
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 mt-1 text-base">
                  Catálogo Base de Clientes
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Lista maestra de productos y códigos SKU de referencia del cliente.
                </p>
                <div className="mt-3 pt-2 border-t border-slate-200 text-xs text-slate-500 font-mono">
                  Destino: client_products
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTarget("SUPPLIER");
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                  !isClientTarget
                    ? "border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Opción B
                  </span>
                  {!isClientTarget && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                      Seleccionado
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 mt-1 text-base">
                  Lista Proveedor con Existencias
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Catálogo de proveedor con inventario actual (Stock) y precios para cruce.
                </p>
                <div className="mt-3 pt-2 border-t border-slate-200 text-xs text-slate-500 font-mono">
                  Destino: supplier_products
                </div>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-slate-900">
                Paso 2: Adjunte el Documento PDF para {isClientTarget ? "el Catálogo del Cliente" : "la Lista del Proveedor"}
              </label>
              <span className="text-xs text-slate-500">
                Límite máximo: 25 MB
              </span>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-300 bg-slate-50 hover:bg-slate-100"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                name="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="hidden"
                style={{ display: "none" }}
              />
              <p className="text-sm font-medium text-slate-800">
                {isClientTarget
                  ? "Arrastre el PDF del Catálogo de Clientes aquí o haga clic para examinar"
                  : "Arrastre el PDF de la Lista del Proveedor aquí o haga clic para examinar"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Formato admitido: PDF nativo con tablas de texto o listas de precios tabulares.
              </p>
              {selectedFile && (
                <div className="mt-4 inline-block bg-white px-4 py-2.5 rounded-lg border border-blue-200 text-xs font-mono text-slate-800 shadow-sm">
                  <span className="font-semibold text-blue-700">Archivo seleccionado:</span> {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </div>
              )}
            </div>
            {clientError && (
              <p className="text-xs text-red-600 mt-2 font-medium">{clientError}</p>
            )}
            {state?.success === false && state.fieldErrors?.file && (
              <p className="text-xs text-red-600 mt-2 font-medium">
                {state.fieldErrors.file.join(", ")}
              </p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPending || !selectedFile}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isPending
                ? "Extrayendo y persistiendo registros..."
                : isClientTarget
                  ? "Procesar Catálogo Base de Clientes"
                  : "Procesar Lista de Existencias de Proveedor"}
            </button>
          </div>
        </div>
      </form>

      {state?.success === false && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <p className="font-semibold">Error al procesar el catálogo:</p>
          <p className="mt-1">{state.error}</p>
        </div>
      )}

      {state?.success === true && state.data && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Resultado de la Ingesta de Catálogo
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Base de Datos: <strong className="text-slate-800 font-mono">catalogo_db</strong> | Tabla: <strong className="text-blue-700 font-mono">{state.data.target === "CLIENT" ? "client_products" : "supplier_products"}</strong>
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Tiempo de ejecución: {state.data.executionTimeMs} ms
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                Páginas Leídas
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {state.data.totalPages}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                Productos Detectados
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {state.data.extractedCount}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                Persistidos en BD
              </span>
              <p className="text-2xl font-bold text-green-700 mt-1">
                {state.data.persistedCount}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                Líneas Descartadas
              </span>
              <p className="text-2xl font-bold text-slate-600 mt-1">
                {state.data.discardedCount}
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {state.data.target === "CLIENT" ? (
              <button
                type="button"
                onClick={handleResetForNextCatalog}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Continuar: Cargar Lista de Proveedor con Stock
              </button>
            ) : (
              <Link
                href="/dashboard/audit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Ir a Bandeja de Auditoría y Ejecutar Conciliación
              </Link>
            )}
            <Link
              href="/dashboard/stock"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              Ver Tablero de Inventario
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
