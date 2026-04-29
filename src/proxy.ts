import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData } from "@/lib/session";
import { publicUrl } from "@/lib/public-url";

const sessionOptions = {
  cookieName: "club_session",
  password: process.env.SESSION_SECRET as string,
  cookieOptions: {
    secure:
      process.env.SESSION_COOKIE_SECURE === "false" ? false : process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
  },
};

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  const pathname = req.nextUrl.pathname;

  // /admin/* 경로는 어드민만 접근 가능
  if (pathname.startsWith("/admin")) {
    if (!session.userId) {
      return NextResponse.redirect(publicUrl("/", req));
    }
    if (session.role !== "ADMIN") {
      return NextResponse.redirect(publicUrl("/?error=forbidden", req));
    }
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
