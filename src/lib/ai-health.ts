export interface AiServiceHealth {
  status: "ONLINE" | "UNVERIFIED" | "ERROR" | "NOT_CONFIGURED";
  message: string;
  statusCode?: number;
}

/**
 * Comprueba de forma no bloqueante y ligera el estado de conectividad del motor de inferencia (Laya / Gateway).
 *
 * @param apiKeyOverride - Opcional para pruebas o inyección de clave sin depender de process.env.
 * @param endpointOverride - Opcional para pruebas o inyección de URL del endpoint.
 */
export async function checkAiServiceHealth(
  apiKeyOverride?: string,
  endpointOverride?: string
): Promise<AiServiceHealth> {
  try {
    const rawUrl =
      endpointOverride ??
      process.env.LAYA_API_URL ??
      (process.env.AI_GATEWAY_API_KEY
        ? "https://ai-gateway.vercel.sh/v1/evaluate"
        : "http://localhost:8000/evaluate");

    const isLocal =
      rawUrl.includes("localhost") ||
      rawUrl.includes("127.0.0.1") ||
      rawUrl.includes("::1");

    const apiKey =
      apiKeyOverride !== undefined ? apiKeyOverride : process.env.AI_GATEWAY_API_KEY;

    if (apiKeyOverride === "") {
      return {
        status: "NOT_CONFIGURED",
        message: "Clave de API no configurada"
      };
    }

    if (!isLocal && (!apiKey || apiKey.trim().length === 0)) {
      return {
        status: "NOT_CONFIGURED",
        message: "Clave de API no configurada"
      };
    }

    const cleanBaseUrl = rawUrl.replace(/\/+$/, "");
    const endpoint = cleanBaseUrl.endsWith("/evaluate")
      ? cleanBaseUrl
      : `${cleanBaseUrl}/evaluate`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (apiKey && apiKey.trim().length > 0 && apiKey !== "local-dev-key") {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model:
          process.env.LAYA_MODEL_ID ||
          process.env.JEV_MODEL_ID ||
          "convaiinnovations/laya",
        state: "health-check",
        questions: {
          ping: {
            type: "noul",
            instructions: "ping"
          }
        }
      }),
      signal: AbortSignal.timeout(3000)
    });

    if (response.status === 200) {
      return {
        status: "ONLINE",
        message: "En línea (Motor IA Laya)"
      };
    }

    if (response.status === 403) {
      return {
        status: "UNVERIFIED",
        statusCode: 403,
        message: "Requiere verificación en el proveedor"
      };
    }

    if (response.status === 401) {
      return {
        status: "ERROR",
        statusCode: 401,
        message: "Clave de API inválida"
      };
    }

    return {
      status: "ERROR",
      statusCode: response.status,
      message: `Error HTTP ${response.status} en servicio de inferencia`
    };
  } catch (error) {
    return {
      status: "ERROR",
      message: (error as Error).message || "Fallo de conexión con servicio de inferencia"
    };
  }
}
