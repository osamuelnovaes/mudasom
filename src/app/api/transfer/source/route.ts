import { NextRequest, NextResponse } from "next/server";
import { getSpotifyAccessToken, hasAcceptedTerms, isAuthenticated, readSession, writeSession } from "@/lib/session";
import { parseSpotifyPlaylistId } from "@/lib/music";

export const runtime = "nodejs";
export const maxDuration = 20;

type SpotifyPlaylist = { name?: string; description?: string; images?: Array<{ url?: string }>; tracks?: { total?: number } };
type SpotifyPage = { items?: Array<{ item?: SpotifyTrack | null; track?: SpotifyTrack | null }>; next?: string | null; total?: number };
type SpotifyTrack = { id?: string; name?: string; artists?: Array<{ name?: string }>; album?: { name?: string }; duration_ms?: number; type?: string; is_local?: boolean };

export async function POST(request: NextRequest) {
  const session = readSession(request);
  if (!isAuthenticated(session)) return NextResponse.json({ error: "Sua sessão terminou. Entre novamente." }, { status: 401 });
  if (!hasAcceptedTerms(session)) return NextResponse.json({ error: "Leia e aceite os Termos de uso antes de usar as integrações." }, { status: 403 });

  let body: { playlistUrl?: unknown; offset?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Informe o link de uma playlist do Spotify." }, { status: 400 });
  }
  const playlistId = typeof body.playlistUrl === "string" ? parseSpotifyPlaylistId(body.playlistUrl) : null;
  const offset = Number.isSafeInteger(body.offset) ? Number(body.offset) : 0;
  if (!playlistId) return NextResponse.json({ error: "Esse link não parece ser uma playlist do Spotify." }, { status: 400 });
  if (offset < 0) return NextResponse.json({ error: "A posição solicitada não é válida." }, { status: 400 });

  try {
    const accessToken = await getSpotifyAccessToken(session);
    const headers = { Authorization: `Bearer ${accessToken}` };
    const [playlistResponse, pageResponse] = await Promise.all([
      fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, { headers, cache: "no-store" }),
      fetch(`https://api.spotify.com/v1/playlists/${playlistId}/items?limit=100&offset=${offset}`, { headers, cache: "no-store" }),
    ]);
    if (!playlistResponse.ok || !pageResponse.ok) {
      const upstreamStatus = !playlistResponse.ok ? playlistResponse.status : pageResponse.status;
      const message = upstreamStatus === 404
        ? "Não encontrei essa playlist. Confira o link e veja se sua conta pode acessá-la."
        : upstreamStatus === 401 || upstreamStatus === 403
          ? "O Spotify não autorizou a leitura dessa playlist. Reconecte a conta e tente de novo."
          : "O Spotify não conseguiu abrir essa playlist agora.";
      const response = NextResponse.json({ error: message }, { status: 502 });
      writeSession(response, session);
      return response;
    }
    const playlist = await playlistResponse.json() as SpotifyPlaylist;
    const page = await pageResponse.json() as SpotifyPage;
    const rawItems = page.items ?? [];
    const tracks = rawItems.flatMap((row, index) => {
      const item = row.item ?? row.track;
      if (!item || item.type === "episode" || item.is_local || !item.name) return [];
      return [{
        id: item.id ?? `${offset + index}`,
        name: item.name,
        artists: (item.artists ?? []).map((artist) => artist.name).filter((name): name is string => Boolean(name)),
        album: item.album?.name ?? "",
        durationMs: item.duration_ms ?? 0,
      }];
    });
    const total = page.total ?? playlist.tracks?.total ?? offset + tracks.length;
    const nextOffset = page.next ? offset + rawItems.length : null;
    const response = NextResponse.json({
      playlist: {
        id: playlistId,
        name: playlist.name ?? "Playlist do Spotify",
        description: playlist.description ?? "",
        cover: playlist.images?.[0]?.url ?? null,
        total,
        nextOffset,
      },
      tracks,
    });
    writeSession(response, session);
    return response;
  } catch (error) {
    const response = NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao carregar a playlist." }, { status: 502 });
    writeSession(response, session);
    return response;
  }
}
