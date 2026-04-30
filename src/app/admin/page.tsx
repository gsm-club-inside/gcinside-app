import Header from "@/components/Header";
import AdminTabs from "@/components/admin/AdminTabs";

export default function AdminPage() {
  return (
    <>
      <Header />
      <main className="bg-muted min-h-[calc(100vh-3.5rem)]">
        <div className="mx-auto max-w-4xl px-6 py-10 sm:py-12">
          <header className="mb-8 space-y-1.5">
            <h1 className="text-[26px] leading-tight font-bold tracking-tight">Admin page</h1>
            <p className="text-muted-foreground text-[15px]">
              동아리 운영에 필요한 모든 작업을 한 곳에서 처리할 수 있어요.
            </p>
          </header>
          <AdminTabs />
        </div>
      </main>
    </>
  );
}
