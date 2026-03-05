import { NextResponse } from "next/server";
import { getBillingStatusBySession } from "@/lib/billing";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId")?.trim();

  if (!sessionId || sessionId.length < 8 || sessionId.length > 128) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "sessionId inválido",
        },
      },
      { status: 400 }
    );
  }

  try {
    const billing = await getBillingStatusBySession(sessionId);
    return NextResponse.json({ billing });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "No se pudo resolver el estado de suscripción.",
        },
      },
      { status: 500 }
    );
  }
}
