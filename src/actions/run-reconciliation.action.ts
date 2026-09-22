"use server";

import { revalidatePath } from "next/cache";
import { ActionResult } from "@/types";
import { getReconciliationWorker } from "@/lib/service-container";

export interface ReconciliationBatchResult {
  processed: number;
  resolved: number;
}

export async function runReconciliationAction(): Promise<ActionResult<ReconciliationBatchResult>> {
  try {
    const worker = getReconciliationWorker();
    const result = await worker.runBatch();

    revalidatePath("/dashboard/audit");
    revalidatePath("/dashboard/stock");

    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || "Fallo crítico al ejecutar el ciclo de conciliación de catálogos."
    };
  }
}
