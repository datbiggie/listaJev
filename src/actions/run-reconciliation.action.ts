"use server";

import { revalidatePath } from "next/cache";
import { ActionResult } from "@/types";
import { getProductRepository, getReconciliationWorker } from "@/lib/service-container";

export interface ReconciliationBatchResult {
  processed: number;
  resolved: number;
}

export interface RunReconciliationOptions {
  reprocessRejected?: boolean;
  allBatches?: boolean;
  maxBatches?: number;
}

/**
 * Server Action para ejecutar ciclos de reconciliación por lotes.
 */
export async function runReconciliationAction(
  options?: RunReconciliationOptions
): Promise<ActionResult<ReconciliationBatchResult>> {
  try {
    const repository = getProductRepository();

    if (options?.reprocessRejected) {
      await repository.resetRejectedMappings();
    }

    const worker = getReconciliationWorker();

    if (options?.allBatches) {
      let totalProcessed = 0;
      let totalResolved = 0;
      const maxLoops = options.maxBatches ?? 100;
      let loopCount = 0;

      while (loopCount < maxLoops) {
        loopCount++;
        const { processed, resolved } = await worker.runBatch();
        if (processed === 0) {
          break;
        }
        totalProcessed += processed;
        totalResolved += resolved;
      }

      revalidatePath("/dashboard/audit");
      revalidatePath("/dashboard/stock");

      return {
        success: true,
        data: {
          processed: totalProcessed,
          resolved: totalResolved
        }
      };
    }

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
      error:
        (error as Error).message ||
        "Fallo crítico al ejecutar el ciclo de conciliación de catálogos."
    };
  }
}
