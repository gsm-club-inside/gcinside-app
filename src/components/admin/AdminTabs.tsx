"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminClubRequests from "@/components/admin/AdminClubRequests";
import AdminClubs from "@/components/admin/AdminClubs";
import AdminEnrollments from "@/components/admin/AdminEnrollments";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminAbuseLogs from "@/components/admin/AdminAbuseLogs";

const TABS = [
  {
    value: "enrollments",
    label: "신청 현황",
    description: "학생들의 동아리 신청 현황을 확인하고 정리해요.",
  },
  {
    value: "clubs",
    label: "동아리",
    description: "기존 동아리의 정원·상태를 관리하고 학생을 직접 추가할 수 있어요.",
  },
  {
    value: "requests",
    label: "생성 요청",
    description: "학생이 보낸 자율동아리 생성 요청을 검토하고 승인·거절해요.",
  },
  {
    value: "settings",
    label: "운영 설정",
    description: "신청 오픈 시간, 학생 정보 갱신, 매크로 방지 설정을 관리해요.",
  },
  {
    value: "abuse",
    label: "어뷰징",
    description: "탐지된 어뷰징과 처리 로그를 확인해요.",
  },
] as const;

type TabValue = (typeof TABS)[number]["value"];

interface ClubRequestSummary {
  id: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

const DEFAULT_TAB: TabValue = "enrollments";

function isTabValue(value: string | null): value is TabValue {
  return !!value && TABS.some((t) => t.value === value);
}

export default function AdminTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const param = searchParams.get("tab");
  const value: TabValue = isTabValue(param) ? param : DEFAULT_TAB;

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["admin-club-requests"],
    queryFn: () =>
      fetch("/api/admin/club-requests").then((r) => r.json()) as Promise<ClubRequestSummary[]>,
    staleTime: 15_000,
    select: (data) => data.filter((req) => req.status === "PENDING").length,
  });

  const handleChange = (next: TabValue) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === DEFAULT_TAB) params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(qs ? `/admin?${qs}` : "/admin", { scroll: false });
  };

  const activeTab = TABS.find((t) => t.value === value);

  return (
    <Tabs value={value} onValueChange={(v) => handleChange(v as TabValue)}>
      <div className="-mx-5 overflow-x-auto sm:mx-0 sm:overflow-visible">
        <TabsList className="px-5 sm:px-0">
          <TabsIndicator />
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
              {tab.value === "requests" && pendingCount > 0 && (
                <span
                  aria-label={`${pendingCount}건 대기 중`}
                  className="bg-primary text-primary-foreground inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[11px] leading-none font-semibold tabular-nums"
                >
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {activeTab && (
        <div
          key={value}
          className="animate-in fade-in-0 -mt-2 space-y-1 duration-150 motion-reduce:animate-none"
        >
          <h2 className="text-[18px] leading-7 font-bold">{activeTab.label}</h2>
          <p className="text-muted-foreground text-[14px] leading-5">{activeTab.description}</p>
        </div>
      )}

      <TabsContent value="enrollments">
        <AdminEnrollments />
      </TabsContent>
      <TabsContent value="clubs">
        <AdminClubs />
      </TabsContent>
      <TabsContent value="requests">
        <AdminClubRequests />
      </TabsContent>
      <TabsContent value="settings">
        <AdminSettings />
      </TabsContent>
      <TabsContent value="abuse">
        <AdminAbuseLogs />
      </TabsContent>
    </Tabs>
  );
}
