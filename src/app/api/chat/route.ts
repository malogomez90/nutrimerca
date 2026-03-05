import { NextResponse } from "next/server";
import { loadFoodsCsv } from "@/lib/csv-loader";
import { consumeDemoQuota } from "@/lib/demo-quota";
import { validateNutritionRules } from "@/lib/nutrition-rules";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatPayload = {
  messages?: ChatMessage[];
  sessionId?: string;
  profile?: {
    goal?: string;
    restrictions?: string[];
  };
};

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

function badRequest(message: string) {
  return NextResponse.json(
    {
      error: {
        code: "BAD_REQUEST",
        message,
      },
    },
    { status: 400 }
  );
}

function validatePayload(body: ChatPayload): string | null {
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 30) {
    return "messages debe ser un array de 1 a 30 elementos";
  }

  const totalChars = body.messages.reduce((acc, m) => acc + (m.content?.length ?? 0), 0);
  if (totalChars > 20_000) {
    return "El tamaño total de mensajes excede el máximo permitido";
  }

  for (const m of body.messages) {
    if (!["system", "user", "assistant"].includes(m.role)) {
      return "role inválido en messages";
    }
    if (!m.content || typeof m.content !== "string") {
      return "content inválido en messages";
    }
  }

  if (!body.sessionId || typeof body.sessionId !== "string" || body.sessionId.length < 8 || body.sessionId.length > 128) {
    return "sessionId inválido";
  }

  if (body.profile?.restrictions && (!Array.isArray(body.profile.restrictions) || body.profile.restrictions.length > 20)) {
    return "profile.restrictions inválido";
  }

  return null;
}

export async function POST(req: Request) {
  const timeoutSignal = AbortSignal.timeout(25_000);

  try {
    const body = (await req.json()) as ChatPayload;
    const validationError = validatePayload(body);
    if (validationError) return badRequest(validationError);

    const quota = consumeDemoQuota(body.sessionId!);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "QUOTA_EXCEEDED",
            message: "Has alcanzado el límite gratuito de 5 mensajes.",
          },
          usage: {
            remainingFreeMessages: 0,
          },
        },
        { status: 429 }
      );
    }

    const csv = await loadFoodsCsv();
    const restrictions = body.profile?.restrictions ?? [];
    const nutrition = validateNutritionRules(csv.rows, restrictions);

    if (nutrition.errors.some((e) => e.code === "RESTRICTION_CONFLICT")) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "No hay alimentos suficientes para las restricciones solicitadas.",
          },
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Falta OPENAI_API_KEY en variables de entorno.",
          },
        },
        { status: 500 }
      );
    }

    const model = process.env.OPENAI_MODEL ?? "gpt-5.2";
    const sampleFoods = nutrition.compatibleFoods.slice(0, 80);
    const datasetContext = sampleFoods
      .map(
        (f) =>
          `- ${f.nombre} | kcal:${f.kcal} prot:${f.proteinas} carb:${f.carbohidratos} grasa:${f.grasas}`
      )
      .join("\n");

    const systemPrompt = [
      "Eres un asistente nutricional útil, natural y conversacional.",
      "Mantén estilo libre y cercano; no uses un formato rígido salvo que el usuario lo pida.",
      "Usa de referencia estos alimentos/métricas del dataset de Mercadona:",
      datasetContext,
      nutrition.warnings.length ? `Advertencias técnicas: ${nutrition.warnings.join(" | ")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const upstream = await fetch(OPENAI_API_URL, {
      method: "POST",
      signal: timeoutSignal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...(body.messages ?? []).map((m) => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.7,
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: `Error de proveedor IA (${upstream.status}). ${text.slice(0, 200)}`,
          },
        },
        { status: 500 }
      );
    }

    const data = await upstream.json();
    const reply = data?.choices?.[0]?.message?.content;

    if (!reply || typeof reply !== "string") {
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "No se pudo obtener respuesta válida del modelo.",
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reply,
      usage: {
        remainingFreeMessages: quota.remainingFreeMessages,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return NextResponse.json(
        {
          error: {
            code: "UPSTREAM_TIMEOUT",
            message: "La solicitud a IA tardó demasiado.",
          },
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Error interno procesando la solicitud.",
        },
      },
      { status: 500 }
    );
  }
}
