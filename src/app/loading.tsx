import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function HomeLoading() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="mb-1 text-2xl font-bold">창체동아리 목록</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          원하는 창체동아리를 선택해 선착순으로 신청하세요.
        </p>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-1 h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
