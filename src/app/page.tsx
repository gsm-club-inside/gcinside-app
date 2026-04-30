import Header from "@/components/Header";
import ClubList from "@/components/ClubList";
import EnrollmentHeading from "@/components/EnrollmentHeading";
import ErrorToast from "@/components/ErrorToast";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getCachedClubs, getCachedSettings } from "@/lib/queries";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [session, clubs, settings, { error }] = await Promise.all([
    getSession(),
    getCachedClubs(),
    getCachedSettings(),
    searchParams,
  ]);

  const initialUser = session.userId
    ? {
        id: session.userId,
        name: session.name!,
        email: session.email!,
        role: session.role!,
        grade: session.grade ?? null,
      }
    : null;

  return (
    <>
      <Header initialUser={initialUser} />
      <ErrorToast error={error} />
      <main className="mx-auto max-w-4xl px-5 py-6 sm:px-6 sm:py-8">
        <section className="mb-6 space-y-2">
          <EnrollmentHeading
            openAt={settings.openAt ? new Date(settings.openAt).toISOString() : null}
          />
          <p className="text-muted-foreground max-w-2xl text-sm leading-6">
            {session.userId ? (
              <>
                신청한 동아리는{" "}
                <Link
                  href="/profile"
                  className="text-primary font-semibold underline underline-offset-4"
                >
                  프로필
                </Link>
                에서 언제든 확인할 수 있어요.
              </>
            ) : (
              <>
                <a
                  href="/api/auth/login"
                  className="text-primary font-semibold underline underline-offset-4"
                >
                  로그인
                </a>
                하면 내 학년 기준으로 정원이 계산돼요.
              </>
            )}
          </p>
        </section>
        <ClubList
          isLoggedIn={!!session.userId}
          initialUserGrade={session.grade ?? null}
          initialClubs={clubs}
          initialSettings={settings}
        />
      </main>
    </>
  );
}
