/**
 * Mapea una colección de elementos de forma concurrente con un límite acotado de tareas simultáneas.
 *
 * @param items - Lista de elementos a procesar.
 * @param limit - Cantidad máxima de ejecuciones asíncronas en paralelo.
 * @param task - Función asíncrona que procesa cada elemento.
 * @returns Promesa que resuelve la lista de resultados preservando el orden original.
 */
export async function mapConcurrent<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  if (limit <= 0) {
    throw new Error("El límite de concurrencia debe ser mayor a 0");
  }

  if (items.length === 0) {
    return [];
  }

  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await task(items[index]!);
    }
  }

  const workerCount = Math.min(limit, items.length);
  const workers = Array.from({ length: workerCount }, () => worker());

  await Promise.all(workers);
  return results;
}
