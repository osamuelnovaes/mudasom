import { NextRequest, NextResponse } from "next/server";
import { callbackCookieOptions, isAuthenticated, readSession, seal, unseal, writeSession } from "@/lib/session";

export const runtime = "nodejs";

function returnHome(request: NextRequest, query: string) {
  const response = NextResponse.redirect(new URL(`/?${query}`, request.url));
  response.cookies.set("mudasom_oauth_spotify", "", { ...callbackCookieOptions(), maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const pending = request.cookies.get("mudasom_oauth_spotify")?.value;
  const pendingState = pending ? unseal<{ state: string }>(pending)?.state : null;
  if (!isAuthenticated(readSession(request))) return returnHome(request, "error=auth-required");
  if (!code || !state || !pendingState || state !== pendingState) return returnHome(request, "error=spotify-state");

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return returnHome(request, "error=spotify-config");

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
      cache: "no-store",
    });
    const tokens = await response.json();
    if (!response.ok || !tokens.access_token || !tokens.refresh_token) return returnHome(request, "error=spotify-token");

    const session = readSession(request);
    session.spotify = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + Number(tokens.expires_in ?? 3600) * 1000,
    };
    const result = NextResponse.redirect(new URL("/?connected=spotify", request.url));
    result.cookies.set("mudasom_oauth_spotify", "", { ...callbackCookieOptions(), maxAge: 0 });
    writeSession(result, session);
    return result;
  } catch {
    return returnHome(request, "error=spotify-token");
  }
}
