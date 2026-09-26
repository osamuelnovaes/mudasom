import { NextRequest, NextResponse } from "next/server";
import { getYoutubeAccessToken, hasAcceptedTerms, isAuthenticated, readSession, writeSession } from "@/lib/session";
import { safeText } from "@/lib/music";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(request: NextRequest) {
  const session = readSession(request);
  if (!isAuthenticated(session)) return NextResponse.json({ error: "Sua sessão terminou. Entre novamente." }, { status: 401 });
  if (!hasAcceptedTerms(session)) return NextResponse.json({ error: "Leia e aceite os Termos de uso antes de usar as integrações." }, { status: 403 });
  let body: { name?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Informe um nome para a playlist." }, { status: 400 }); }
  const name = safeText(body.name, 140);
  if (!name) return NextResponse.json({ error: "Informe um nome para a playlist." }, { status: 400 });

  try {
    const accessToken = await getYoutubeAccessToken(session);
    const responseFromYoutube = await fetch("https://www.googleapis.com/youtube/v3/playlists?part=snippet,status", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        snippet: { title: name, description: "Criada com MudaSom — leve suas playlists com você." },
        status: { privacyStatus: "private" },
      }),
      cache: "no-store",
    });
    const result = await responseFromYoutube.json();
    if (!responseFromYoutube.ok || !result.id) {
      const reason = result.error?.errors?.[0]?.reason;
      const quotaReached = ["quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded"].includes(reason);
      const response = NextResponse.json({
        code: quotaReached ? "YOUTUBE_WRITE_QUOTA" : undefined,
        error: quotaReached
          ? "A cota diária do YouTube acabou antes da criação da playlist. Tente novamente depois."
          : "O YouTube não conseguiu criar a playlist. Confira as permissões da conta.",
      }, { status: quotaReached ? 429 : 502 });
      writeSession(response, session);
      return response;
    }
    const response = NextResponse.json({ id: result.id, url: `https://www.youtube.com/playlist?list=${result.id}` });
    writeSession(response, session);
    return response;
  } catch (error) {
    const response = NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao criar a playlist." }, { status: 502 });
    writeSession(response, session);
    return response;
  }
}
