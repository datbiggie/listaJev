"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, IngestionSummary, UploadCatalogSchema } from "@/types";
import { getCatalogIngestionService } from "@/lib/service-container";

export async function ingestCatalogAction(
  _prevState: ActionResult<IngestionSummary> | null,
  formData: FormData
): Promise<ActionResult<IngestionSummary>> {
  const rawInput = {
    target: formData.get("target"),
    file: formData.get("file")
  };

  const validation = UploadCatalogSchema.safeParse(rawInput);
  if (!validation.success) {
    return {
      success: false,
      error: "Datos de formulario inválidos.",
      fieldErrors: validation.error.flatten().fieldErrors
    };
  }

  const { target, file } = validation.data;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const ingestionService = getCatalogIngestionService();
    const summary = await ingestionService.processCatalogPdf(arrayBuffer, target);

    revalidatePath("/dashboard/ingest");
    revalidatePath("/dashboard/stock");
    revalidatePath("/dashboard/audit");

    return {
      success: true,
      data: summary
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || "Fallo crítico durante el procesamiento del archivo PDF."
    };
  }
}
