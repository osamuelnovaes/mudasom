import { NextRequest, NextResponse } from "next/server";
import { getSpotifyAccessToken, getYoutubeAccessToken, hasAcceptedTerms, isAuthenticated, readSession, writeSession } from "@/lib/session";
import { parseSpotifyPlaylistId, parseYouTubePlaylistId } from "@/lib/music";

export const runtime = "nodejs";
export const maxDuration = 20;

type Provider = "spotify" | "youtube";
type SpotifyPlaylist = { name?: string; description?: string; images?: Array<{ url?: string }>; items?: { total?: number }; tracks?: { total?: number } };
type SpotifyPage = { items?: Array<{ item?: SpotifyTrack | null; track?: SpotifyTrack | null }>; next?: string | null; total?: number };
type SpotifyTrack = { id?: string; uri?: string; name?: string; artists?: Array<{ name?: string }>; album?: { name?: string }; duration_ms?: number; type?: string; is_local?: boolean; external_urls?: { spotify?: string } };
type YouTubePlaylist = { id?: string; snippet?: { title?: string; description?: string; thumbnails?: { medium?: { url?: string }; default?: { url?: string } } }; contentDetails?: { itemCount?: number } };
type YouTubePage = { items?: Array<{ snippet?: { title?: string; channelTitle?: string; resourceId?: { videoId?: string } }; contentDetails?: { videoId?: string } }>; nextPageToken?: string; pageInfo?: { totalResults?: number } };

function spotifyError(status: number) {
  if (status === 404) return "Não encontrei essa playlist. Confira o link e se sua conta pode acessá-la.";
  if (status === 401 || status === 403) return "O Spotify não autorizou a leitura dessa playlist. Reconecte a conta e tente de novo.";
  return "O Spotify não conseguiu abrir essa playlist agora.";
}

function youtubeError(status: number) {
  if (status === 404) return "Não encontrei essa playlist do YouTube. Confira o link e as permissões da conta.";
  if (status === 401 || status === 403) return "O YouTube não autorizou a leitura dessa playlist. Reconecte a conta e tente de novo.";
  return "O YouTube não conseguiu abrir essa playlist agora.";
}

export async function POST(request: NextRequest) {
  const session = readSession(request);
  if (!isAuthenticated(session)) return NextResponse.json({ error: "A sessão segura não está configurada." }, { status: 401 });
  if (!hasAcceptedTerms(session)) return NextResponse.json({ error: "Leia e aceite os Termos de uso antes de usar as integrações." }, { status: 403 });

  let body: { sourceProvider?: unknown; playlistUrl?: unknown; cursor?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Informe o link de uma playlist." }, { status: 400 }); }
  const sourceProvider: Provider | null = body.sourceProvider === "spotify" || body.sourceProvider === "youtube" ? body.sourceProvider : null;
  const playlistUrl = typeof body.playlistUrl === "string" ? body.playlistUrl : "";
  const cursor = typeof body.cursor === "string" ? body.cursor : "";
  if (!sourceProvider) return NextResponse.json({ error: "Escolha Spotify ou YouTube como origem." }, { status: 400 });

  try {
    if (sourceProvider === "spotify") {
      const playlistId = parseSpotifyPlaylistId(playlistUrl);
      const offset = cursor ? Number(cursor) : 0;
      if (!playlistId) return NextResponse.json({ error: "Cole o link de uma playlist do Spotify." }, { status: 400 });
      if (!Number.isSafeInteger(offset) || offset < 0) return NextResponse.json({ error: "A página solicitada não é válida." }, { status: 400 });

      const accessToken = await getSpotifyAccessToken(session);
      const headers = { Authorization: `Bearer ${accessToken}` };
      const [playlistResponse, pageResponse] = await Promise.all([
        fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, { headers, cache: "no-store" }),
        fetch(`https://api.spotify.com/v1/playlists/${playlistId}/items?limit=100&offset=${offset}`, { headers, cache: "no-store" }),
      ]);
      if (!playlistResponse.ok || !pageResponse.ok) {
        const response = NextResponse.json({ error: spotifyError(!playlistResponse.ok ? playlistResponse.status : pageResponse.status) }, { status: 502 });
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
          sourceUrl: item.external_urls?.spotify ?? (item.id ? `https://open.spotify.com/track/${item.id}` : undefined),
        }];
      });
      const total = page.total ?? playlist.items?.total ?? playlist.tracks?.total ?? offset + tracks.length;
      const nextCursor = page.next ? String(offset + rawItems.length) : null;
      const response = NextResponse.json({
        playlist: { id: playlistId, name: playlist.name ?? "Playlist do Spotify", description: playlist.description ?? "", cover: playlist.images?.[0]?.url ?? null, sourceUrl: `https://open.spotify.com/playlist/${playlistId}`, total, sourceProvider, nextCursor },
        tracks,
      });
      writeSession(response, session);
      return response;
    }

    const playlistId = parseYouTubePlaylistId(playlistUrl);
    if (!playlistId) return NextResponse.json({ error: "Cole o link de uma playlist do YouTube ou YouTube Music." }, { status: 400 });
    if (cursor.length > 2000) return NextResponse.json({ error: "O cursor da playlist não é válido." }, { status: 400 });
    const accessToken = await getYoutubeAccessToken(session);
    const playlistUrlApi = new URL("https://www.googleapis.com/youtube/v3/playlists");
    playlistUrlApi.search = new URLSearchParams({ part: "snippet,contentDetails", id: playlistId }).toString();
    const pageUrlApi = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    const pageParams: Record<string, string> = { part: "snippet,contentDetails", playlistId, maxResults: "50" };
    if (cursor) pageParams.pageToken = cursor;
    pageUrlApi.search = new URLSearchParams(pageParams).toString();
    const headers = { Authorization: `Bearer ${accessToken}` };
    const [playlistResponse, pageResponse] = await Promise.all([
      fetch(playlistUrlApi, { headers, cache: "no-store" }),
      fetch(pageUrlApi, { headers, cache: "no-store" }),
    ]);
    if (!playlistResponse.ok || !pageResponse.ok) {
      const response = NextResponse.json({ error: youtubeError(!playlistResponse.ok ? playlistResponse.status : pageResponse.status) }, { status: 502 });
      writeSession(response, session);
      return response;
    }
    const playlistBody = await playlistResponse.json() as { items?: YouTubePlaylist[] };
    const page = await pageResponse.json() as YouTubePage;
    const playlist = playlistBody.items?.[0];
    if (!playlist) {
      const response = NextResponse.json({ error: "Não encontrei essa playlist do YouTube na conta conectada." }, { status: 404 });
      writeSession(response, session);
      return response;
    }
    const tracks = (page.items ?? []).flatMap((item, index) => {
      const id = item.snippet?.resourceId?.videoId ?? item.contentDetails?.videoId;
      const name = item.snippet?.title;
      if (!id || !name || name === "Deleted video" || name === "Private video") return [];
      return [{
        id,
        name,
        artists: item.snippet?.channelTitle ? [item.snippet.channelTitle] : ["Canal do YouTube"],
        album: "",
        durationMs: 0,
        sourceUrl: `https://www.youtube.com/watch?v=${id}`,
      }];
    });
    const response = NextResponse.json({
      playlist: {
        id: playlistId,
        name: playlist.snippet?.title ?? "Playlist do YouTube",
        description: playlist.snippet?.description ?? "",
        cover: playlist.snippet?.thumbnails?.medium?.url ?? playlist.snippet?.thumbnails?.default?.url ?? null,
        sourceUrl: `https://www.youtube.com/playlist?list=${playlistId}`,
        total: playlist.contentDetails?.itemCount ?? page.pageInfo?.totalResults ?? tracks.length,
        sourceProvider,
        nextCursor: page.nextPageToken ?? null,
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
