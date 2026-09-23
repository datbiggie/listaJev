export interface AiServiceHealth {
  status: "ONLINE" | "UNVERIFIED" | "ERROR" | "NOT_CONFIGURED";
  message: string;
  statusCode?: number;
}

/**
 * Comprueba de forma no bloqueante y ligera el estado de conectividad y facturación de Vercel AI Gateway.
 *
 * @param apiKeyOverride - Opcional para pruebas o inyección de clave sin depender de process.env.
 */
export async function checkAiServiceHealth(apiKeyOverride?: string): Promise<AiServiceHealth> {
  try {
    const apiKey = apiKeyOverride ?? process.env.AI_GATEWAY_API_KEY;

    if (!apiKey || apiKey.trim().length === 0) {
      return {
        status: "NOT_CONFIGURED",
        message: "Clave de API no configurada"
      };
    }

    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1
      }),
      signal: AbortSignal.timeout(3000)
    });

    if (response.status === 200) {
      return {
        status: "ONLINE",
        message: "En línea (Vercel AI Gateway activo)"
      };
    }

    if (response.status === 403) {
      return {
        status: "UNVERIFIED",
        statusCode: 403,
        message: "Requiere verificación en Vercel"
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
      message: `Error HTTP ${response.status} en AI Gateway`
    };
  } catch (error) {
    return {
      status: "ERROR",
      message: (error as Error).message || "Fallo de conexión con AI Gateway"
    };
  }
}
