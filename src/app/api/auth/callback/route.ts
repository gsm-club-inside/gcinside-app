import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/session";
import { exchangeCodeForToken, fetchUserInfo, hasOAuthScope, isAdminEmail } from "@/lib/oauth";
import { prisma } from "@/lib/prisma";
import { TAGS } from "@/lib/queries";
import { publicUrl } from "@/lib/public-url";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const session = await getSession();

  if (!state || state !== session.oauthState) {
    return NextResponse.redirect(publicUrl("/?error=invalid_state", req));
  }

  if (!code || !session.codeVerifier) {
    return NextResponse.redirect(publicUrl("/?error=missing_code", req));
  }

  let step = "token_exchange";
  try {
    const tokens = await exchangeCodeForToken(code, session.codeVerifier);

    step = "validate_scope";
    if (!hasOAuthScope(tokens.scope, "self:read")) {
      throw new Error(
        `OAuth token missing required scope self:read. Received scope: ${tokens.scope || "(empty)"}`
      );
    }

    step = "fetch_user_info";
    const oauthUser = await fetchUserInfo(tokens.access_token);

    step = "db_upsert";
    const role = isAdminEmail(oauthUser.email) ? "ADMIN" : "STUDENT";

    const studentData = {
      name: oauthUser.student?.name ?? oauthUser.email,
      studentNumber: oauthUser.student?.studentNumber
        ? Number(oauthUser.student.studentNumber)
        : null,
      grade: oauthUser.student?.grade ? Number(oauthUser.student.grade) : null,
      classNum: oauthUser.student?.classNum ? Number(oauthUser.student.classNum) : null,
      number: oauthUser.student?.number ? Number(oauthUser.student.number) : null,
      major: oauthUser.student?.major ?? null,
    };

    const existing = await prisma.user.findFirst({
      where: { OR: [{ oauthId: oauthUser.id }, { email: oauthUser.email }] },
    });

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            oauthId: oauthUser.id,
            email: oauthUser.email,
            ...studentData,
            role,
            refreshToken: tokens.refresh_token ?? existing.refreshToken,
          },
        })
      : await prisma.user.create({
          data: {
            oauthId: oauthUser.id,
            email: oauthUser.email,
            ...studentData,
            role,
            refreshToken: tokens.refresh_token ?? null,
          },
        });

    step = "session_save";
    session.userId = user.id;
    session.email = user.email;
    session.name = user.name;
    session.role = user.role;
    session.grade = user.grade ?? null;
    session.codeVerifier = undefined;
    session.oauthState = undefined;
    await session.save();
    revalidateTag(TAGS.users, {});

    return NextResponse.redirect(publicUrl(role === "ADMIN" ? "/admin" : "/", req));
  } catch (err) {
    console.error(`OAuth callback error at step [${step}]:`, err);
    return NextResponse.redirect(publicUrl("/?error=auth_failed", req));
  }
}
