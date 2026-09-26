import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated, readSession, verifyPassword, writeSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!process.env.APP_PASSWORD || process.env.APP_PASSWORD.length < 16 || !process.env.APP_SESSION_SECRET || process.env.APP_SESSION_SECRET.length < 32) {
    return NextResponse.json({ error: "Configure APP_PASSWORD com pelo menos 16 caracteres e APP_SESSION_SECRET com pelo menos 32." }, { status: 503 });
  }

  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Envie a senha de acesso." }, { status: 400 });
  }
  if (typeof body.password !== "string" || !verifyPassword(body.password)) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const session = readSession(request);
  session.authenticatedUntil = Date.now() + 1000 * 60 * 60 * 24 * 14;
  const response = NextResponse.json({ authenticated: isAuthenticated(session) });
  writeSession(response, session);
  return response;
}
