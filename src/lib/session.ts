import { getIronSession, IronSession, IronSessionData } from "iron-session";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export interface SessionData {
  userId?: number;
  email?: string;
  name?: string;
  role?: "STUDENT" | "ADMIN";
  grade?: number | null;
  codeVerifier?: string;
  oauthState?: string;
}

declare module "iron-session" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IronSessionData extends SessionData {}
}

const sessionOptions = {
  cookieName: "club_session",
  password: process.env.SESSION_SECRET as string,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7일
  },
};

export async function getSession(): Promise<IronSession<IronSessionData>> {
  const cookieStore = await cookies();
  return getIronSession<IronSessionData>(cookieStore, sessionOptions);
}

export async function getSessionFromRequest(
  req: NextRequest,
  res: NextResponse
): Promise<IronSession<IronSessionData>> {
  return getIronSession<IronSessionData>(req, res, sessionOptions);
}
