import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminLoading() {
  return (
    <>
      <Header />
      <main className="bg-muted min-h-[calc(100vh-3.5rem)]">
        <div className="mx-auto max-w-4xl px-6 py-10 sm:py-12">
          <header className="mb-8 space-y-2">
            <Skeleton className="h-7 w-24" />
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
            <Card>
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
