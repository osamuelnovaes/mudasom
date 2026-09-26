import { NextRequest, NextResponse } from "next/server";
import { getYoutubeAccessToken, isAuthenticated, readSession, writeSession } from "@/lib/session";
import { safeText, scoreVideo, type TrackInput, type VideoCandidate } from "@/lib/music";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(request: NextRequest) {
  const session = readSession(request);
  if (!isAuthenticated(session)) return NextResponse.json({ error: "Sua sessão terminou. Entre novamente." }, { status: 401 });

  let body: { track?: Partial<TrackInput> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Não recebi os dados da faixa." }, { status: 400 });
  }
  const name = safeText(body.track?.name, 180);
  const artists = Array.isArray(body.track?.artists) ? body.track?.artists.map((artist) => safeText(artist, 100)).filter(Boolean).slice(0, 8) : [];
  if (!name || artists.length === 0) return NextResponse.json({ error: "A faixa precisa ter título e artista." }, { status: 400 });
  const track: TrackInput = { name, artists, album: safeText(body.track?.album, 180), durationMs: Number(body.track?.durationMs) || 0 };

  try {
    const accessToken = await getYoutubeAccessToken(session);
    const query = `${artists.slice(0, 3).join(" ")} ${name}`;
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.search = new URLSearchParams({
      part: "snippet",
      type: "video",
      maxResults: "5",
      q: query,
      regionCode: "BR",
      relevanceLanguage: "pt-BR",
    }).toString();
    const searchResponse = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const results = await searchResponse.json();
    if (!searchResponse.ok) {
      const reason = results.error?.errors?.[0]?.reason;
      const quotaReached = ["quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded"].includes(reason);
      const apiDisabled = reason === "accessNotConfigured" || reason === "serviceDisabled";
      const accessDenied = searchResponse.status === 401 || searchResponse.status === 403;
      const response = NextResponse.json({
        code: quotaReached ? "YOUTUBE_QUOTA" : apiDisabled ? "YOUTUBE_API_DISABLED" : accessDenied ? "YOUTUBE_ACCESS" : undefined,
        error: quotaReached
          ? "A cota diária do YouTube acabou. As faixas restantes continuam pendentes; tente novamente após a reposição da cota."
          : apiDisabled
            ? "Ative a YouTube Data API v3 no projeto do Google Cloud conectado."
            : accessDenied
              ? "O YouTube recusou a pesquisa. Confira o escopo OAuth e as permissões da conta."
            : "O YouTube não conseguiu pesquisar essa faixa agora.",
      }, { status: quotaReached ? 429 : 502 });
      writeSession(response, session);
      return response;
    }
    const candidates: VideoCandidate[] = (results.items ?? [])
      .filter((item: { id?: { videoId?: string }; snippet?: { title?: string } }) => item.id?.videoId && item.snippet?.title)
      .map((item: { id: { videoId: string }; snippet: { title: string; channelTitle?: string } }) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle ?? "Canal do YouTube",
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        score: scoreVideo(track, item.snippet.title, item.snippet.channelTitle ?? ""),
      }))
      .sort((left: VideoCandidate, right: VideoCandidate) => right.score - left.score);
    const response = NextResponse.json({ candidates });
    writeSession(response, session);
    return response;
  } catch (error) {
    const response = NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao pesquisar a faixa." }, { status: 502 });
    writeSession(response, session);
    return response;
  }
}
