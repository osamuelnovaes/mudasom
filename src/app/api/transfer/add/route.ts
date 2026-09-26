import { NextRequest, NextResponse } from "next/server";
import { getSpotifyAccessToken, getYoutubeAccessToken, hasAcceptedTerms, isAuthenticated, readSession, writeSession } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(request: NextRequest) {
  const session = readSession(request);
  if (!isAuthenticated(session)) return NextResponse.json({ error: "A sessão segura não está configurada." }, { status: 401 });
  if (!hasAcceptedTerms(session)) return NextResponse.json({ error: "Leia e aceite os Termos de uso antes de usar as integrações." }, { status: 403 });
  let body: { targetProvider?: unknown; playlistId?: unknown; itemId?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dados inválidos para incluir a faixa." }, { status: 400 }); }
  const targetProvider = body.targetProvider === "spotify" || body.targetProvider === "youtube" ? body.targetProvider : "youtube";
  const playlistId = typeof body.playlistId === "string" ? body.playlistId : "";
  const itemId = typeof body.itemId === "string" ? body.itemId : "";

  try {
    if (targetProvider === "spotify") {
      if (!/^[A-Za-z0-9]{22}$/.test(playlistId) || !/^spotify:track:[A-Za-z0-9]+$/.test(itemId)) {
        return NextResponse.json({ error: "Playlist ou faixa do Spotify inválida." }, { status: 400 });
      }
      const accessToken = await getSpotifyAccessToken(session);
      const spotifyResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/items`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ uris: [itemId] }),
        cache: "no-store",
      });
      if (!spotifyResponse.ok) {
        const rateLimited = spotifyResponse.status === 429;
        const response = NextResponse.json({
          code: rateLimited ? "SPOTIFY_RATE_LIMIT" : undefined,
          error: rateLimited ? "O Spotify está limitando as gravações por enquanto. A transferência pode ser retomada depois." : "O Spotify não conseguiu adicionar uma das faixas. A lista pode continuar incompleta.",
        }, { status: rateLimited ? 429 : 502 });
        writeSession(response, session);
        return response;
      }
      const response = NextResponse.json({ added: true });
      writeSession(response, session);
      return response;
    }

    if (!/^[A-Za-z0-9_-]{6,100}$/.test(playlistId) || !/^[A-Za-z0-9_-]{6,30}$/.test(itemId)) {
      return NextResponse.json({ error: "Playlist ou vídeo do YouTube inválido." }, { status: 400 });
    }
    const accessToken = await getYoutubeAccessToken(session);
    const youtubeResponse = await fetch("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ snippet: { playlistId, resourceId: { kind: "youtube#video", videoId: itemId } } }),
      cache: "no-store",
    });
    if (!youtubeResponse.ok) {
      const details = await youtubeResponse.json().catch(() => ({}));
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
