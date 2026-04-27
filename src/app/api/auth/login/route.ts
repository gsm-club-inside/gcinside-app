import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { buildAuthorizationUrl, generateCodeVerifier, generateState } from "@/lib/oauth";

export async function GET() {
  const session = await getSession();

  const codeVerifier = generateCodeVerifier();
  const state = generateState();

  session.codeVerifier = codeVerifier;
  session.oauthState = state;
  await session.save();

  const authUrl = await buildAuthorizationUrl(codeVerifier, state);

  return NextResponse.redirect(authUrl);
}
