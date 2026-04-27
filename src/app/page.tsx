import Header from "@/components/Header";
import ClubList from "@/components/ClubList";
import ErrorToast from "@/components/ErrorToast";
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
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="space-y-1">
          <h1 className="text-2xl font-bold tracking-normal">창체동아리</h1>
          <p className="text-muted-foreground text-sm">
            원하는 동아리를 비교하고 신청 현황을 확인하세요.
          </p>
        </section>
        <ClubList isLoggedIn={!!session.userId} initialClubs={clubs} initialSettings={settings} />
      </main>
    </>
  );
}
