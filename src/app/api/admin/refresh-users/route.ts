import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { refreshAccessToken, fetchUserInfo, isAdminEmail } from "@/lib/oauth";
import { TAGS } from "@/lib/queries";

export async function POST() {
  const session = await getSession();
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [users, totalUsers] = await Promise.all([
    prisma.user.findMany({
      where: { refreshToken: { not: null } },
      select: { id: true, name: true, email: true, refreshToken: true },
    }),
    prisma.user.count({ where: { role: "STUDENT" } }),
  ]);

  const results = await Promise.allSettled(
    users.map(async (user) => {
      try {
        const tokens = await refreshAccessToken(user.refreshToken!);
        const oauthUser = await fetchUserInfo(tokens.access_token);
        const role = isAdminEmail(oauthUser.email) ? "ADMIN" : "STUDENT";

        await prisma.user.update({
          where: { id: user.id },
          data: {
            name: oauthUser.student?.name ?? oauthUser.email,
            studentNumber: oauthUser.student?.studentNumber ?? null,
            grade: oauthUser.student?.grade ?? null,
            classNum: oauthUser.student?.classNum ?? null,
            number: oauthUser.student?.number ?? null,
            major: oauthUser.student?.major ?? null,
            role,
            refreshToken: tokens.refresh_token ?? user.refreshToken,
          },
        });

        return { id: user.id, name: user.name };
      } catch (err) {
        const message = String(err);
        if (message.includes("invalid_grant")) {
          await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken: null },
          });
        }
        throw err;
      }
    })
  );

  const succeeded = results
    .filter(
      (r): r is PromiseFulfilledResult<{ id: number; name: string }> => r.status === "fulfilled"
    )
    .map((r) => r.value);

  const failed = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) => ({ name: users[i].name, reason: String(r.reason) }));

  const expiredCount = failed.filter((f) => f.reason.includes("invalid_grant")).length;

  revalidateTag(TAGS.users, {});

  return NextResponse.json({
    succeeded: succeeded.length,
    failed: failed.length,
    expired: expiredCount,
    failedUsers: failed,
    totalStudents: totalUsers,
    withToken: users.length,
  });
}
