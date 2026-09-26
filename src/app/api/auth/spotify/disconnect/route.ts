import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated, readSession, writeSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = readSession(request);
  if (!isAuthenticated(session)) return NextResponse.json({ error: "Entre novamente." }, { status: 401 });
  delete session.spotify;
  const response = NextResponse.json({ connected: false });
  writeSession(response, session);
  return response;
}
