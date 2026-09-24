"use client";

import { useState, useActionState, useRef, type DragEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { ingestCatalogAction } from "@/actions/ingest-catalog.action";
import { ActionResult, CatalogTarget, IngestionSummary } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import {
  UploadCloudIcon,
  FileTextIcon,
  CheckIcon,
  XIcon,
  ArrowRightIcon,
  RefreshIcon
} from "@/components/icons";

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
      setClientError("Solo se admiten documentos en formato PDF comercial estándar.");
      setSelectedFile(null);
      return false;
    }
    if (file.size <= 0) {
      setClientError("El archivo seleccionado está vacío.");
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

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setClientError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
    <div className="space-y-6">
      {/* <PageHeader
        title="Centro de Ingesta y Extracción de Catálogos"
        description="Normalización automática y persistencia transaccional de listas comerciales en formato PDF."
        badge="Pipeline ETL"
        badgeVariant="neutral"
      /> */}

      {/* Stepper Informativo en Card */}
      <Card padding={false}>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-200">
          <div className="p-4 flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white font-mono text-xs font-bold shadow-xs">
              1
            </span>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                Catálogo Base Cliente
              </h4>
              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                Carga el PDF de productos locales para registrar la base de referencia.
              </p>
            </div>
          </div>

          <div className="p-4 flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white font-mono text-xs font-bold shadow-xs">
              2
            </span>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                Lista de Proveedor
              </h4>
              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                Carga el PDF con existencias y precios del proveedor
              </p>
            </div>
          </div>

          <div className="p-4 flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white font-mono text-xs font-bold shadow-xs">
              3
            </span>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                Cruce y Conciliación
              </h4>
              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                Audita y aprueba equivalencias semánticas en la Bandeja de Auditoría.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="target" value={target} />

        <Card className="space-y-6">
          {/* Paso 1: Selección de Entidad Destino */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-4">
              <div>
                <label className="text-sm font-semibold text-zinc-900">
                  Paso 1: Seleccione el Tipo de Catálogo
                </label>
                <p className="text-xs text-zinc-500">
                  Indique a qué tabla relacional corresponde el documento a procesar.
                </p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 bg-zinc-100 rounded-md text-zinc-600 border border-zinc-200">
                Tabla:{" "}
                <strong className="text-zinc-900">
                  {isClientTarget ? "client_products" : "supplier_products"}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setTarget("CLIENT");
                  handleRemoveFile();
                }}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  isClientTarget
                    ? "border-zinc-900 bg-zinc-50/75 shadow-xs ring-1 ring-zinc-900"
                    : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold border bg-zinc-100 text-zinc-800 border-zinc-200">
                    Lista de productos
                  </span>
                  {isClientTarget && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-zinc-900">
                      <CheckIcon className="size-3.5" /> Seleccionado
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-zinc-900 mt-2 text-sm sm:text-base">
                  Catálogo Maestro de productos
                </h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  Lista maestra de referencias, códigos SKU y descripciones del cliente para referencia de inventario.
                </p>
                <div className="mt-4 pt-3 border-t border-zinc-200/80 text-[11px] text-zinc-500 font-mono flex items-center justify-between">
                  <span>Esquema: client_products</span>
                  <span className="text-zinc-700 font-semibold">SKU + Descripción</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTarget("SUPPLIER");
                  handleRemoveFile();
                }}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  !isClientTarget
                    ? "border-zinc-900 bg-zinc-50/75 shadow-xs ring-1 ring-zinc-900"
                    : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-500/20">
                    Lista con Inventario
                  </span>
                  {!isClientTarget && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-zinc-900">
                      <CheckIcon className="size-3.5" /> Seleccionado
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-zinc-900 mt-2 text-sm sm:text-base">
                  Lista de Existencias del Proveedor
                </h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  Catálogo con existencias actuales (Stock) y costos del proveedor para cruce determinista.
                </p>
                <div className="mt-4 pt-3 border-t border-zinc-200/80 text-[11px] text-zinc-500 font-mono flex items-center justify-between">
                  <span>Esquema: supplier_products</span>
                  <span className="text-zinc-700 font-semibold">SKU + Stock + Precio</span>
                </div>
              </button>
            </div>
          </div>

          {/* Paso 2: Adjuntar Archivo PDF */}
          <div className="pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="text-sm font-semibold text-zinc-900">
                  Paso 2: Adjunte el Documento PDF ({isClientTarget ? "Catálogo Cliente" : "Lista Proveedor"})
                </label>
                <p className="text-xs text-zinc-500">
                  Documento digitalizado o nativo con tablas de productos y referencias.
                </p>
              </div>
              <span className="text-xs text-zinc-400 font-medium">
                Límite: 25 MB
              </span>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !selectedFile && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging
                  ? "border-zinc-900 bg-zinc-100/70"
                  : selectedFile
                    ? "border-zinc-300 bg-zinc-50/50"
                    : "border-zinc-300 bg-zinc-50/30 hover:bg-zinc-100/50 hover:border-zinc-400 cursor-pointer"
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

              {selectedFile ? (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="size-11 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-xs">
                    <FileTextIcon className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900">
                      {selectedFile.name}
                    </h4>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Documento PDF verificado
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 shadow-2xs transition-colors"
                    >
                      Reemplazar Archivo
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 shadow-2xs transition-colors"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="size-11 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center border border-zinc-200">
                    <UploadCloudIcon className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-800">
                      {isClientTarget
                        ? "Arrastre el Catálogo del Cliente aquí o haga clic para examinar"
                        : "Arrastre la Lista del Proveedor aquí o haga clic para examinar"}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Formatos admitidos: Documentos PDF con tablas comerciales y códigos.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {clientError && (
              <p className="text-xs text-rose-600 mt-2 font-medium flex items-center gap-1.5">
                <XIcon className="size-4 shrink-0" /> {clientError}
              </p>
            )}
            {state?.success === false && state.fieldErrors?.file && (
              <p className="text-xs text-rose-600 mt-2 font-medium flex items-center gap-1.5">
                <XIcon className="size-4 shrink-0" /> {state.fieldErrors.file.join(", ")}
              </p>
            )}
          </div>

          {/* Botón de Procesamiento */}
          <div className="flex justify-end pt-3 border-t border-zinc-200">
            <button
              type="submit"
              disabled={isPending || !selectedFile}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isPending ? (
                <>
                  <RefreshIcon className="size-4 animate-spin" />
                  <span>Procesando y Extrayendo Registros...</span>
                </>
              ) : (
                <>
                  <FileTextIcon className="size-4" />
                  <span>
                    {isClientTarget
                      ? "Procesar Catálogo Base de Clientes"
                      : "Procesar Lista de Existencias de Proveedor"}
                  </span>
                </>
              )}
            </button>
          </div>
        </Card>
      </form>

      {/* Alerta de Error */}
      {state?.success === false && (
        <Card className="border-rose-200 bg-rose-50/50 p-4 text-rose-800 space-y-1">
          <p className="font-semibold text-xs uppercase tracking-wide">
            Error durante el procesamiento del catálogo:
          </p>
          <p className="text-xs font-mono text-rose-700">{state.error}</p>
        </Card>
      )}

      {/* Resumen de Resultados de Ingesta */}
      {state?.success === true && state.data && (
        <Card className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-200 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-500/20">
                <CheckIcon className="size-3" /> Ingesta Completada Exitosamente
              </div>
              <h3 className="text-base font-bold text-zinc-900 mt-2">
                Resumen de Ingesta y Persistencia Relacional
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Tabla de destino:{" "}
                <strong className="text-zinc-900 font-mono">
                  {state.data.target === "CLIENT" ? "client_products" : "supplier_products"}
                </strong>
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1 bg-zinc-100 rounded-lg text-zinc-600 border border-zinc-200 self-start sm:self-center">
              Tiempo: {state.data.executionTimeMs} ms
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200">
              <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block">
                Páginas Leídas
              </span>
              <p className="text-2xl font-bold text-zinc-900 mt-1">
                {state.data.totalPages.toLocaleString()}
              </p>
            </div>

            <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200">
              <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block">
                Detectados
              </span>
              <p className="text-2xl font-bold text-zinc-900 mt-1">
                {state.data.extractedCount.toLocaleString()}
              </p>
            </div>

            <div className="p-4 bg-emerald-50/40 rounded-lg border border-emerald-200/80">
              <span className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider block">
                Persistidos en BD
              </span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {state.data.persistedCount.toLocaleString()}
              </p>
            </div>

            <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200">
              <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block">
                Descartados
              </span>
              <p className="text-2xl font-bold text-zinc-600 mt-1">
                {state.data.discardedCount.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {state.data.target === "CLIENT" ? (
              <button
                type="button"
                onClick={handleResetForNextCatalog}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-zinc-800 transition"
              >
                <span>Continuar: Cargar Lista de Proveedor</span>
                <ArrowRightIcon className="size-4" />
              </button>
            ) : (
              <Link
                href="/dashboard/audit"
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-zinc-800 transition"
              >
                <span>Ir a Bandeja de Auditoría</span>
                <ArrowRightIcon className="size-4" />
              </Link>
            )}

            <Link
              href="/dashboard/stock"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 shadow-2xs transition"
            >
              <span>Ver Tablero de Inventario</span>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
