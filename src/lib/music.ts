export type TrackInput = {
  name: string;
  artists: string[];
  album?: string;
  durationMs?: number;
  sourceUrl?: string;
};

export type TrackCandidate = {
  id: string;
  title: string;
  channel: string;
  url: string;
  score: number;
};

const EXTRA_WORDS = new Set([
  "official", "audio", "video", "lyrics", "lyric", "topic", "visualizer", "hd", "4k",
  "remastered", "remaster", "video", "music", "vevo", "feat", "ft",
]);

export function normalizeMusicText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word && !EXTRA_WORDS.has(word));
}

function overlapScore(expected: string[], actual: string[]) {
  if (expected.length === 0 || actual.length === 0) return 0;
  const actualSet = new Set(actual);
  const hits = expected.filter((word) => actualSet.has(word)).length;
  return hits / expected.length;
}

export function scoreVideo(track: TrackInput, candidateTitle: string, candidateChannel: string) {
  const wantedTitle = normalizeMusicText(track.name);
  const candidateWords = normalizeMusicText(candidateTitle);
  const titleScore = overlapScore(wantedTitle, candidateWords);
  const artistTerms = track.artists.map(normalizeMusicText).filter((words) => words.length > 0);
  const artistScore = artistTerms.length
    ? Math.max(...artistTerms.map((artist) => Math.max(
        overlapScore(artist, candidateWords),
        overlapScore(artist, normalizeMusicText(candidateChannel)),
      )))
    : 0;
  return Math.round((titleScore * 0.68 + artistScore * 0.32) * 100);
}

export function parseSpotifyPlaylistId(input: string) {
  const value = input.trim();
  const bareId = value.match(/^[A-Za-z0-9]{22}$/);
  if (bareId) return bareId[0];
  try {
    const url = new URL(value);
    if (url.hostname.toLowerCase() !== "open.spotify.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const playlistPosition = parts.indexOf("playlist");
    const id = parts[playlistPosition + 1];
    if (playlistPosition < 0 || !id || !/^[A-Za-z0-9]{22}$/.test(id)) return null;
    return id;
  } catch {
    return null;
  }
}

export function parseYouTubePlaylistId(input: string) {
  const value = input.trim();
  if (/^[A-Za-z0-9_-]{10,80}$/.test(value)) return value;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (!["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) return null;
    const id = url.searchParams.get("list");
    return id && /^[A-Za-z0-9_-]{10,80}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function safeText(value: unknown, maxLength = 200) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}
