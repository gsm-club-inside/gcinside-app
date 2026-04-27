import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        <section>
          <h1 className="mb-4 text-2xl font-bold">My Profile</h1>
          <div className="bg-card space-y-4 rounded-xl border p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="size-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 border-t pt-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <Skeleton className="mb-1 h-3 w-8" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">신청한 동아리</h2>
          <ul className="space-y-3">
            {[1, 2].map((i) => (
              <li
                key={i}
                className="bg-card flex items-center justify-between rounded-xl border p-4"
              >
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-8 w-12 rounded-md" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
