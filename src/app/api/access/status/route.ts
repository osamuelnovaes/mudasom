import { NextRequest, NextResponse } from "next/server";
import { hasAcceptedTerms, isAuthenticated, readSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = readSession(request);
  return NextResponse.json({
    configured: Boolean(process.env.APP_SESSION_SECRET && process.env.APP_SESSION_SECRET.length >= 32),
    authenticated: isAuthenticated(session),
    termsAccepted: hasAcceptedTerms(session),
    spotifyConfigured: Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET && process.env.SPOTIFY_REDIRECT_URI),
    youtubeConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI),
    spotifyConnected: Boolean(session.spotify?.refreshToken),
    youtubeConnected: Boolean(session.youtube?.refreshToken),
  });
}
