import { NextRequest, NextResponse } from "next/server";
import { callbackCookieOptions, hasAcceptedTerms, isAuthenticated, readSession, unseal, writeSession } from "@/lib/session";

export const runtime = "nodejs";

function returnHome(request: NextRequest, query: string) {
  const response = NextResponse.redirect(new URL(`/?${query}`, request.url));
  response.cookies.set("mudasom_oauth_youtube", "", { ...callbackCookieOptions(), maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const pending = request.cookies.get("mudasom_oauth_youtube")?.value;
  const pendingState = pending ? unseal<{ state: string }>(pending)?.state : null;
  const session = readSession(request);
  if (!isAuthenticated(session)) return returnHome(request, "error=auth-required");
  if (!hasAcceptedTerms(session)) return returnHome(request, "error=terms-required");
  if (!code || !state || !pendingState || state !== pendingState) return returnHome(request, "error=youtube-state");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return returnHome(request, "error=youtube-config");

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
      cache: "no-store",
    });
    const tokens = await response.json();
    if (!response.ok || !tokens.access_token) return returnHome(request, "error=youtube-token");

    const refreshToken = tokens.refresh_token ?? session.youtube?.refreshToken;
    if (!refreshToken) return returnHome(request, "error=youtube-refresh");
    session.youtube = {
      accessToken: tokens.access_token,
      refreshToken,
      expiresAt: Date.now() + Number(tokens.expires_in ?? 3600) * 1000,
    };
    const result = NextResponse.redirect(new URL("/?connected=youtube", request.url));
    result.cookies.set("mudasom_oauth_youtube", "", { ...callbackCookieOptions(), maxAge: 0 });
    writeSession(result, session);
    return result;
  } catch {
    return returnHome(request, "error=youtube-token");
  }
}
