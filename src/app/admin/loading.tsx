import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminLoading() {
  return (
    <>
      <Header />
      <main className="bg-background min-h-[calc(100vh-3.5rem)]">
        <div className="mx-auto max-w-4xl px-5 py-6 sm:px-6 sm:py-8">
          <header className="mb-6 space-y-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-72" />
          </header>

          <div className="border-border mb-6 flex h-12 items-center gap-1 border-b">
            {["w-16", "w-12", "w-16", "w-16"].map((w, i) => (
              <Skeleton key={i} className={`mx-3 h-4 ${w}`} />
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-48" />
              <Skeleton className="ml-auto h-8 w-24" />
            </div>
            <Card className="ring-border/60 rounded-[22px] border-0 py-0 shadow-none ring-1">
              <CardContent className="space-y-3 p-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
