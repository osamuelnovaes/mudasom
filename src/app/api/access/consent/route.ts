import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated, readSession, writeSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = readSession(request);
  if (!isAuthenticated(session)) return NextResponse.json({ error: "Entre novamente." }, { status: 401 });

  let body: { accepted?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Informe sua escolha." }, { status: 400 }); }
  if (typeof body.accepted !== "boolean") return NextResponse.json({ error: "Informe sua escolha." }, { status: 400 });

  if (body.accepted) {
    session.termsVersion = 1;
    session.termsAcceptedAt = Date.now();
  } else {
    delete session.termsVersion;
    delete session.termsAcceptedAt;
  }
  const response = NextResponse.json({ accepted: Boolean(session.termsVersion) });
  writeSession(response, session);
  return response;
}
