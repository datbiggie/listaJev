import { describe, it, expect } from "vitest";
import { mapConcurrent } from "../../src/concurrency.js";

describe("SPEC-WORKER-006: Utilidad mapConcurrent", () => {
  it("procesa todos los elementos y preserva el orden de entrada", async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await mapConcurrent(items, 2, async (item) => {
      return item * 2;
    });

    expect(results).toEqual([2, 4, 6, 8, 10]);
  });

  it("respeta el límite de concurrencia máxima en todo momento", async () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const maxConcurrency = 3;
    let activeTasks = 0;
    let peakConcurrency = 0;

    await mapConcurrent(items, maxConcurrency, async (item) => {
      activeTasks++;
      if (activeTasks > peakConcurrency) {
        peakConcurrency = activeTasks;
      }
      await new Promise((res) => setTimeout(res, 10));
      activeTasks--;
      return item;
    });

    expect(peakConcurrency).toBeLessThanOrEqual(maxConcurrency);
    expect(peakConcurrency).toBeGreaterThan(0);
  });

  it("retorna arreglo vacío si la lista de entrada está vacía", async () => {
    const results = await mapConcurrent([], 5, async (x) => x);
    expect(results).toEqual([]);
  });

  it("lanza error si el límite de concurrencia es menor o igual a 0", async () => {
    await expect(mapConcurrent([1], 0, async (x) => x)).rejects.toThrow(
      "El límite de concurrencia debe ser mayor a 0"
    );
  });
});
