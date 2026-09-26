import { NextRequest, NextResponse } from "next/server";
import { callbackCookieOptions, isAuthenticated, makeOAuthState, readSession, seal } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isAuthenticated(readSession(request))) return NextResponse.redirect(new URL("/?auth=required", request.url));
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !redirectUri) return NextResponse.redirect(new URL("/?error=spotify-config", request.url));

  const state = makeOAuthState();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "playlist-read-private playlist-read-collaborative",
    state,
  });
  const response = NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`);
  response.cookies.set("mudasom_oauth_spotify", seal({ state }), callbackCookieOptions());
  return response;
}
