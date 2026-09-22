import { z } from "zod";

/**
 * Esquema Zod de validación estricta para variables de entorno del sistema.
 */
export const EnvironmentSchema = z
  .object({
    DATABASE_URL: z
      .string()
      .url("DATABASE_URL debe ser una URI válida de conexión PostgreSQL"),
    AI_GATEWAY_API_KEY: z
      .string()
      .min(1, "AI_GATEWAY_API_KEY es obligatoria para la comunicación con Vercel AI Gateway"),
    JEV_MODEL_ID: z
      .string()
      .min(1)
      .default("typesafe-ai/jev"),
    BATCH_SIZE: z.coerce
      .number()
      .int()
      .positive("BATCH_SIZE debe ser un entero positivo")
      .default(50),
    MAX_CONCURRENCY: z.coerce
      .number()
      .int()
      .positive("MAX_CONCURRENCY debe ser un entero positivo")
      .default(5),
    PG_TRGM_THRESHOLD: z.coerce
      .number()
      .min(0.0)
      .max(1.0, "PG_TRGM_THRESHOLD debe encontrarse en el rango [0.0, 1.0]")
      .default(0.60),
    CONFIRMED_MATCH_THRESHOLD: z.coerce
      .number()
      .min(0.0)
      .max(1.0, "CONFIRMED_MATCH_THRESHOLD debe encontrarse en el rango [0.0, 1.0]")
      .default(0.90),
    REVIEW_MATCH_THRESHOLD: z.coerce
      .number()
      .min(0.0)
      .max(1.0, "REVIEW_MATCH_THRESHOLD debe encontrarse en el rango [0.0, 1.0]")
      .default(0.70)
  })
  .refine(
    (data) => data.CONFIRMED_MATCH_THRESHOLD > data.REVIEW_MATCH_THRESHOLD,
    {
      message: "CONFIRMED_MATCH_THRESHOLD debe ser estrictamente mayor que REVIEW_MATCH_THRESHOLD",
      path: ["CONFIRMED_MATCH_THRESHOLD"]
    }
  );

export type AppConfig = z.infer<typeof EnvironmentSchema>;

/**
 * Carga y valida la configuración del sistema aplicando el principio Fail-Fast.
 *
 * @param env - Diccionario de variables de entorno (por defecto process.env).
 * @returns Configuración tipada e inmutable de la aplicación.
 * @throws Error descriptivo si la validación de variables falla.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = EnvironmentSchema.safeParse(env);

  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");
    throw new Error(`Configuración de entorno inválida: ${errorDetails}`);
  }

  return result.data;
}
