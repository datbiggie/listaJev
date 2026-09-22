"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, ResolveReviewActionInput, ResolveReviewActionSchema } from "@/types";
import { getProductRepository } from "@/lib/service-container";

export async function resolveReviewAction(
  payload: ResolveReviewActionInput
): Promise<ActionResult<{ clientSku: string; status: string }>> {
  const validation = ResolveReviewActionSchema.safeParse(payload);
  if (!validation.success) {
    return {
      success: false,
      error: "Payload de resolución inválido.",
      fieldErrors: validation.error.flatten().fieldErrors
    };
  }

  const { clientSku, supplierSku, resolution, reviewer } = validation.data;

  try {
    const repository = getProductRepository();
    await repository.resolveAuditReview(clientSku, supplierSku ?? null, resolution, reviewer);

    revalidatePath("/dashboard/audit");
    revalidatePath("/dashboard/stock");

    return {
      success: true,
      data: { clientSku, status: resolution }
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || "Fallo al persistir la decisión de auditoría."
    };
  }
}
