import { NextRequest, NextResponse } from "next/server";
import { getYoutubeAccessToken, hasAcceptedTerms, isAuthenticated, readSession, writeSession } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(request: NextRequest) {
  const session = readSession(request);
  if (!isAuthenticated(session)) return NextResponse.json({ error: "Sua sessão terminou. Entre novamente." }, { status: 401 });
  if (!hasAcceptedTerms(session)) return NextResponse.json({ error: "Leia e aceite os Termos de uso antes de usar as integrações." }, { status: 403 });
  let body: { playlistId?: unknown; videoId?: unknown; position?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dados inválidos para incluir a faixa." }, { status: 400 }); }
  const playlistId = typeof body.playlistId === "string" && /^[A-Za-z0-9_-]{6,100}$/.test(body.playlistId) ? body.playlistId : "";
  const videoId = typeof body.videoId === "string" && /^[A-Za-z0-9_-]{6,30}$/.test(body.videoId) ? body.videoId : "";
  if (!playlistId || !videoId) return NextResponse.json({ error: "Playlist ou vídeo inválido." }, { status: 400 });

  try {
    const accessToken = await getYoutubeAccessToken(session);
    const resultFromYoutube = await fetch("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ snippet: { playlistId, resourceId: { kind: "youtube#video", videoId } } }),
      cache: "no-store",
    });
    if (!resultFromYoutube.ok) {
      const details = await resultFromYoutube.json().catch(() => ({}));
      const reason = details.error?.errors?.[0]?.reason;
      const quotaReached = ["quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded"].includes(reason);
      const fullPlaylist = reason === "playlistContainsMaximumNumberOfVideos";
      const response = NextResponse.json({
        code: quotaReached ? "YOUTUBE_WRITE_QUOTA" : fullPlaylist ? "YOUTUBE_PLAYLIST_FULL" : undefined,
        error: quotaReached
          ? "A cota diária de gravação do YouTube acabou. A transferência pode ser retomada depois, na mesma playlist."
          : fullPlaylist
            ? "O YouTube recusou novas faixas porque essa playlist atingiu o limite aceito pelo serviço."
            : "O YouTube não conseguiu adicionar uma das faixas. A lista pode continuar incompleta.",
      }, { status: quotaReached ? 429 : 502 });
      writeSession(response, session);
      return response;
    }
    const response = NextResponse.json({ added: true });
    writeSession(response, session);
    return response;
  } catch (error) {
    const response = NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao adicionar a faixa." }, { status: 502 });
    writeSession(response, session);
    return response;
  }
}
