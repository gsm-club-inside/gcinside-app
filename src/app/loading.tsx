import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function HomeLoading() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-5 py-6 sm:px-6 sm:py-8">
        <section className="mb-6 space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <Skeleton className="h-4 w-3/4 max-w-lg" />
        </section>
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card rounded-[22px] border-0 py-0 shadow-none ring-0">
              <CardHeader className="px-5 pt-4 pb-0 sm:px-6 sm:pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                    <Skeleton className="h-[25.5px] w-36 rounded-lg" />
                    <Skeleton className="h-[21px] w-full max-w-60 rounded-lg" />
                    <Skeleton className="h-[21px] w-40 rounded-lg sm:hidden" />
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Skeleton className="size-9 rounded-full" />
                    <Skeleton className="h-8 w-24 rounded-full" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 px-5 pt-4 pb-5 sm:px-6 sm:pt-4 sm:pb-6">
                <div className="space-y-3.5">
                  {[1, 2].map((grade) => (
                    <div key={grade} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <Skeleton className="h-[18px] w-12 rounded-md" />
                        <Skeleton className="h-[18px] w-8 rounded-md" />
                      </div>
                      <Skeleton className="h-1.5 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
