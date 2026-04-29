"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

type AbuseAiMode = "OFF" | "SHADOW" | "ENFORCE";

interface AbuseModelSettings {
  abuseLearningEnabled: boolean;
  abuseAiMode: AbuseAiMode;
  abuseActiveModel: string;
  abuseCandidateModel: string | null;
  abuseCanaryRatio: number;
}

interface AbuseModelArtifact {
  id: number;
  version: string;
  description: string | null;
  storageUri: string | null;
  status: string;
  createdAt: string;
}

function AbuseModelSettingsForm({ settings }: { settings: AbuseModelSettings }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    learningEnabled: settings.abuseLearningEnabled,
    aiMode: settings.abuseAiMode,
    activeModel: settings.abuseActiveModel,
    candidateModel: settings.abuseCandidateModel ?? "",
    canaryPercent: Math.round((settings.abuseCanaryRatio ?? 0) * 100),
  });
  const [newModel, setNewModel] = useState({ version: "", description: "", storageUri: "" });

  const { data: modelData } = useQuery<{ models: AbuseModelArtifact[] }>({
    queryKey: ["abuse-models"],
    queryFn: () => fetch("/api/admin/abuse/models").then((r) => r.json()),
    staleTime: 30_000,
  });
  const models = modelData?.models ?? [];

  const saveMutation = useMutation({
    mutationFn: () =>
      fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          abuseLearningEnabled: form.learningEnabled,
          abuseAiMode: form.aiMode,
          abuseActiveModel: form.activeModel,
          abuseCandidateModel: form.candidateModel,
          abuseCanaryRatio: form.canaryPercent / 100,
        }),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "저장 실패");
        return data;
      }),
    onSuccess: () => {
      toast.success("AI 매크로 방지 설정이 저장되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err: Error) => toast.error("저장 실패", { description: err.message }),
  });

  const promoteMutation = useMutation({
    mutationFn: () =>
      fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "promoteCandidate" }),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "적용 실패");
        return data as AbuseModelSettings;
      }),
    onSuccess: (data) => {
      toast.success("후보 모델을 활성 모델로 적용했습니다.");
      setForm((prev) => ({
        ...prev,
        activeModel: data.abuseActiveModel,
        candidateModel: data.abuseCandidateModel ?? "",
        canaryPercent: Math.round((data.abuseCanaryRatio ?? 0) * 100),
      }));
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err: Error) => toast.error("적용 실패", { description: err.message }),
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      fetch("/api/admin/abuse/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newModel),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "등록 실패");
        return data as AbuseModelArtifact;
      }),
    onSuccess: (model) => {
      toast.success("모델이 등록되었습니다.");
      setNewModel({ version: "", description: "", storageUri: "" });
      setForm((prev) => ({ ...prev, candidateModel: model.version }));
      queryClient.invalidateQueries({ queryKey: ["abuse-models"] });
    },
    onError: (err: Error) => toast.error("등록 실패", { description: err.message }),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="abuseAiMode">탐지 모드</Label>
          <Select
            value={form.aiMode}
            onValueChange={(value) =>
              setForm((prev) => ({ ...prev, aiMode: value as AbuseAiMode }))
            }
          >
            <SelectTrigger id="abuseAiMode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OFF">OFF</SelectItem>
              <SelectItem value="SHADOW">SHADOW</SelectItem>
              <SelectItem value="ENFORCE">ENFORCE</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="abuseCanaryRatio">후보 모델 카나리 적용률</Label>
          <Input
            id="abuseCanaryRatio"
            type="number"
            min={0}
            max={100}
            value={form.canaryPercent}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                canaryPercent: Math.max(0, Math.min(100, Number(e.target.value))),
              }))
            }
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="abuseActiveModel">활성 모델</Label>
          <Select
            value={form.activeModel}
            onValueChange={(value) =>
              setForm((prev) => ({ ...prev, activeModel: value ?? prev.activeModel }))
            }
          >
            <SelectTrigger id="abuseActiveModel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.version}>
                  {model.version}
                </SelectItem>
              ))}
              {!models.some((model) => model.version === form.activeModel) && (
                <SelectItem value={form.activeModel}>{form.activeModel}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="abuseCandidateModel">후보 모델</Label>
          <Select
            value={form.candidateModel || "none"}
            onValueChange={(value) =>
              setForm((prev) => ({
                ...prev,
                candidateModel: !value || value === "none" ? "" : value,
              }))
            }
          >
            <SelectTrigger id="abuseCandidateModel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">없음</SelectItem>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.version}>
                  {model.version}
                </SelectItem>
              ))}
              {form.candidateModel &&
                !models.some((model) => model.version === form.candidateModel) && (
                  <SelectItem value={form.candidateModel}>{form.candidateModel}</SelectItem>
                )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border p-3">
        <Label className="mb-2 block">모델 등록</Label>
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
          <Input
            aria-label="모델 버전"
            placeholder="model-version"
            value={newModel.version}
            onChange={(e) => setNewModel((prev) => ({ ...prev, version: e.target.value }))}
          />
          <Input
            aria-label="설명"
            placeholder="설명"
            value={newModel.description}
            onChange={(e) => setNewModel((prev) => ({ ...prev, description: e.target.value }))}
          />
          <Input
            aria-label="저장 위치"
            placeholder="s3://bucket/model"
            value={newModel.storageUri}
            onChange={(e) => setNewModel((prev) => ({ ...prev, storageUri: e.target.value }))}
          />
          <Button
            variant="outline"
            disabled={!newModel.version.trim() || registerMutation.isPending}
            onClick={() => registerMutation.mutate()}
          >
            등록
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="abuseLearningEnabled"
            checked={form.learningEnabled}
            onCheckedChange={(checked) =>
              setForm((prev) => ({ ...prev, learningEnabled: Boolean(checked) }))
            }
          />
          <Label htmlFor="abuseLearningEnabled" className="cursor-pointer font-normal">
            학습 데이터 수집
          </Label>
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            disabled={!form.candidateModel.trim() || promoteMutation.isPending}
            onClick={() => promoteMutation.mutate()}
          >
            {promoteMutation.isPending ? "적용 중..." : "후보 모델 적용"}
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI 매크로 방지</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || !settings ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <AbuseModelSettingsForm
              key={[
                settings.abuseLearningEnabled,
                settings.abuseAiMode,
                settings.abuseActiveModel,
                settings.abuseCandidateModel,
                settings.abuseCanaryRatio,
              ].join(":")}
              settings={{
                abuseLearningEnabled: settings.abuseLearningEnabled ?? true,
                abuseAiMode: settings.abuseAiMode ?? "SHADOW",
                abuseActiveModel: settings.abuseActiveModel ?? "mock-risk-v1",
                abuseCandidateModel: settings.abuseCandidateModel ?? null,
                abuseCanaryRatio: settings.abuseCanaryRatio ?? 0,
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
