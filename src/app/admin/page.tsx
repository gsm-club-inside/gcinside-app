import Header from "@/components/Header";
import AdminTabs from "@/components/admin/AdminTabs";

export default function AdminPage() {
  return (
    <>
      <Header />
      <main className="bg-background min-h-[calc(100vh-3.5rem)]">
        <div className="mx-auto max-w-4xl px-5 py-6 sm:px-6 sm:py-8">
          <header className="mb-6 space-y-2">
            <h1 className="text-2xl leading-tight font-bold sm:text-3xl">관리자 페이지</h1>
            <p className="text-muted-foreground text-[15px]">
              신청 현황을 확인하고, 동아리와 운영 설정을 필요한 만큼만 빠르게 조정할 수 있어요.
            </p>
          </header>
          <AdminTabs />
        </div>
      </main>
    </>
  );
}
