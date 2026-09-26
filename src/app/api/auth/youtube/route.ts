import { NextRequest, NextResponse } from "next/server";
import { callbackCookieOptions, isAuthenticated, makeOAuthState, readSession, seal } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isAuthenticated(readSession(request))) return NextResponse.redirect(new URL("/?auth=required", request.url));
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) return NextResponse.redirect(new URL("/?error=youtube-config", request.url));

  const state = makeOAuthState();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "https://www.googleapis.com/auth/youtube.force-ssl",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  response.cookies.set("mudasom_oauth_youtube", seal({ state }), callbackCookieOptions());
  return response;
}
