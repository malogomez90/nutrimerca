import { NextResponse } from "next/server";
import { getOrCreateUserBySession } from "@/lib/billing";

type LoginPayload = {
  sessionId?: string;
  email?: string;
};

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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  const normalized = normalizeEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LoginPayload;
    const sessionId = body.sessionId?.trim();
    const emailRaw = body.email ?? "";
    const email = normalizeEmail(emailRaw);

    if (!sessionId || sessionId.length < 8 || sessionId.length > 128) {
      return badRequest("sessionId inválido");
    }

    if (!email || !isValidEmail(email)) {
      return badRequest("email inválido");
    }

    const user = await getOrCreateUserBySession(sessionId, email);

    return NextResponse.json({
      user: {
        id: user.id,
        sessionId: user.session_id,
        email: user.email,
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "No se pudo iniciar sesión.",
        },
      },
      { status: 500 }
    );
  }
}
