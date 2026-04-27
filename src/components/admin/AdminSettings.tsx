"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function utcToKstInput(utcStr: string | null): string {
  if (!utcStr) return "";
  const kst = new Date(new Date(utcStr).getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 16);
}

function kstInputToUtc(kstStr: string): string | null {
  if (!kstStr) return null;
  return new Date(kstStr + ":00+09:00").toISOString();
}

function SettingsForm({ initialOpenAt }: { initialOpenAt: string }) {
  const [openAt, setOpenAt] = useState(initialOpenAt);

  const mutation = useMutation({
    mutationFn: (openAtUtc: string | null) =>
      fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openAt: openAtUtc }),
      }).then(async (res) => {
        if (!res.ok) throw new Error();
      }),
    onSuccess: () => toast.success("저장되었습니다."),
    onError: () => toast.error("저장 실패"),
  });

  return (
    <div className="flex items-end gap-3">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="globalOpenAt" className="text-muted-foreground text-xs font-normal">
          KST 기준 · 미설정 시 즉시 오픈 · 동아리별 신청 활성화가 켜져 있으면 무시됨
        </Label>
        <Input
          id="globalOpenAt"
          type="datetime-local"
          value={openAt}
          onChange={(e) => setOpenAt(e.target.value)}
        />
      </div>
      <Button onClick={() => mutation.mutate(kstInputToUtc(openAt))} disabled={mutation.isPending}>
        {mutation.isPending ? "저장 중..." : "저장"}
      </Button>
      {openAt && (
        <Button
          variant="outline"
          onClick={() => {
            setOpenAt("");
            mutation.mutate(null);
          }}
          disabled={mutation.isPending}
        >
          초기화
        </Button>
      )}
    </div>
  );
}

function RefreshUsersButton() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      fetch("/api/admin/refresh-users", { method: "POST" }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "오류 발생");
        return data as {
          succeeded: number;
          failed: number;
          expired: number;
          failedUsers: { name: string; reason: string }[];
          totalStudents: number;
          withToken: number;
        };
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-enrollments"] });

      if (data.withToken === 0) {
        toast.warning("갱신 가능한 학생 없음", {
          description: "토큰이 저장된 학생이 없습니다. 학생들이 재로그인한 후 다시 시도하세요.",
        });
      } else if (data.failed === 0) {
        toast.success(`학번/학년 갱신 완료`, {
          description: `${data.succeeded}명 갱신됨`,
        });
      } else {
        const otherFailed = data.failed - data.expired;
        const parts = [
          `성공 ${data.succeeded}명`,
          data.expired > 0 && `토큰 만료 ${data.expired}명 (재로그인 필요)`,
          otherFailed > 0 && `기타 오류 ${otherFailed}명`,
        ]
          .filter(Boolean)
          .join(" · ");
        toast.warning(`갱신 완료 (일부 실패)`, { description: parts });
      }
    },
    onError: (err: Error) => toast.error("갱신 실패", { description: err.message }),
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "갱신 중..." : "학번/학년 일괄 갱신"}
        </Button>
        <span className="text-muted-foreground text-xs">
          DataGSM OAuth로 모든 학생의 학번·학년을 최신 정보로 갱신합니다
          {mutation.isSuccess && (
            <>
              {" "}
              · 토큰 보유 {mutation.data.withToken} / {mutation.data.totalStudents}명
            </>
          )}
        </span>
      </div>
      {mutation.isSuccess && mutation.data.withToken === 0 && (
        <p className="text-muted-foreground text-xs">
          리프레시 토큰이 저장된 학생이 없습니다. 학생들이 로그아웃 후 재로그인하면 토큰이
          저장됩니다.
        </p>
      )}
      {mutation.isSuccess && mutation.data.expired > 0 && (
        <p className="text-muted-foreground text-xs">
          토큰 만료:{" "}
          {mutation.data.failedUsers
            .filter((u) => u.reason.includes("invalid_grant"))
            .map((u) => u.name)
            .join(", ")}
        </p>
      )}
      {mutation.isSuccess && mutation.data.failed - mutation.data.expired > 0 && (
        <p className="text-destructive text-xs">
          기타 오류:{" "}
          {mutation.data.failedUsers
            .filter((u) => !u.reason.includes("invalid_grant"))
            .map((u) => u.name)
            .join(", ")}
        </p>
      )}
    </div>
  );
}

export default function AdminSettings() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">신청 오픈 시간</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <SettingsForm
              key={settings?.openAt ?? "none"}
              initialOpenAt={utcToKstInput(settings?.openAt ?? null)}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">학생 정보 갱신</CardTitle>
        </CardHeader>
        <CardContent>
          <RefreshUsersButton />
        </CardContent>
      </Card>
    </div>
  );
}
