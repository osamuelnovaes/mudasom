import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

export type ProviderToken = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  accountLabel?: string;
};

export type AppSession = {
  termsAcceptedAt?: number;
  termsVersion?: number;
  spotify?: ProviderToken;
  youtube?: ProviderToken;
};

const AUTH_COOKIE = "mudasom_auth";
const SPOTIFY_COOKIE = "mudasom_spotify";
const YOUTUBE_COOKIE = "mudasom_youtube";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 14;
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: COOKIE_MAX_AGE,
};

function sessionKey() {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Configure APP_SESSION_SECRET com pelo menos 32 caracteres.");
  }
  return createHash("sha256").update(`mudasom:${secret}`).digest();
}

export function seal(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sessionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function unseal<T>(value: string): T | null {
  try {
    const packed = Buffer.from(value, "base64url");
    if (packed.length < 29) return null;
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const encrypted = packed.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", sessionKey(), iv);
    decipher.setAuthTag(tag);
    const decoded = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}

export function readSession(request: NextRequest): AppSession {
  const authRaw = request.cookies.get(AUTH_COOKIE)?.value;
  const spotifyRaw = request.cookies.get(SPOTIFY_COOKIE)?.value;
  const youtubeRaw = request.cookies.get(YOUTUBE_COOKIE)?.value;
  const auth = authRaw ? unseal<Pick<AppSession, "termsAcceptedAt" | "termsVersion">>(authRaw) : null;
  const spotify = spotifyRaw ? unseal<ProviderToken>(spotifyRaw) : null;
  const youtube = youtubeRaw ? unseal<ProviderToken>(youtubeRaw) : null;
  return {
    ...(auth?.termsAcceptedAt ? { termsAcceptedAt: auth.termsAcceptedAt } : {}),
    ...(auth?.termsVersion ? { termsVersion: auth.termsVersion } : {}),
    ...(spotify ? { spotify } : {}),
    ...(youtube ? { youtube } : {}),
  };
}

export function writeSession(response: NextResponse, session: AppSession) {
  const save = (name: string, value: unknown) => response.cookies.set(name, seal(value), SESSION_COOKIE_OPTIONS);
  const clear = (name: string) => response.cookies.set(name, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  if (session.termsVersion) save(AUTH_COOKIE, {
    ...(session.termsAcceptedAt ? { termsAcceptedAt: session.termsAcceptedAt } : {}),
    ...(session.termsVersion ? { termsVersion: session.termsVersion } : {}),
  }); else clear(AUTH_COOKIE);
  if (session.spotify) save(SPOTIFY_COOKIE, session.spotify); else clear(SPOTIFY_COOKIE);
  if (session.youtube) save(YOUTUBE_COOKIE, session.youtube); else clear(YOUTUBE_COOKIE);
}

export function clearSession(response: NextResponse) {
  for (const name of [AUTH_COOKIE, SPOTIFY_COOKIE, YOUTUBE_COOKIE]) {
    response.cookies.set(name, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  }
}

export function isAuthenticated(_session: AppSession) {
  const secret = process.env.APP_SESSION_SECRET;
  return Boolean(secret && secret.length >= 32);
}

export function hasAcceptedTerms(session: AppSession) {
  return isAuthenticated(session) && session.termsVersion === 1 && Boolean(session.termsAcceptedAt);
}

export function callbackCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
}

export async function getSpotifyAccessToken(session: AppSession): Promise<string> {
  const token = session.spotify;
  if (!token) throw new Error("Conecte sua conta do Spotify antes de continuar.");
  if (token.expiresAt > Date.now() + 60_000) return token.accessToken;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Configure as credenciais do Spotify no ambiente.");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: token.refreshToken }),
    cache: "no-store",
  });
  const refreshed = await response.json();
  if (!response.ok || !refreshed.access_token) throw new Error("A sessão do Spotify expirou. Conecte novamente.");
  session.spotify = {
    ...token,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token ?? token.refreshToken,
    expiresAt: Date.now() + Number(refreshed.expires_in ?? 3600) * 1000,
  };
  return session.spotify.accessToken;
}

export async function getYoutubeAccessToken(session: AppSession): Promise<string> {
  const token = session.youtube;
  if (!token) throw new Error("Conecte sua conta do YouTube antes de continuar.");
  if (token.expiresAt > Date.now() + 60_000) return token.accessToken;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Configure as credenciais do Google no ambiente.");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: token.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const refreshed = await response.json();
  if (!response.ok || !refreshed.access_token) throw new Error("A sessão do Google expirou. Conecte novamente.");
  session.youtube = {
    ...token,
    accessToken: refreshed.access_token,
    expiresAt: Date.now() + Number(refreshed.expires_in ?? 3600) * 1000,
  };
  return session.youtube.accessToken;
}

export function makeOAuthState() {
  return randomBytes(32).toString("base64url");
}
