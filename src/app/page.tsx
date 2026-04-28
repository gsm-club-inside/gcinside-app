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
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="mb-1 text-2xl font-bold">창체동아리 목록</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          원하는 창체동아리를 선택해 선착순으로 신청하세요.
        </p>
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
