"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NotebookPen, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type LogAction = "confirmed_abuse" | "false_positive" | "monitoring" | "resolved";

interface AbuseAdminLog {
  id: string;
  requestId: string;
  adminUserId: number | null;
  adminName: string | null;
  adminEmail: string | null;
  action: LogAction;
  note: string;
  createdAt: string;
}

interface AbuseDecisionRecord {
  id: string;
  requestId: string;
  userId: number | null;
  sessionId: string | null;
  ipHash: string | null;
  deviceHash: string | null;
  action: string;
  score: number;
  decision: string;
  reasons: unknown;
  ruleVersion: string;
  modelVersion: string | null;
  createdAt: string;
  logs: AbuseAdminLog[];
}

const ACTION_LABEL: Record<LogAction, string> = {
  confirmed_abuse: "어뷰징 확인",
  false_positive: "오탐",
  monitoring: "모니터링",
  resolved: "처리 완료",
};

const DECISION_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  MONITOR: "secondary",
  CHALLENGE: "outline",
  RATE_LIMIT: "destructive",
  TEMP_BLOCK: "destructive",
  HARD_BLOCK: "destructive",
  MANUAL_REVIEW: "outline",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function reasonCodes(reasons: unknown): string[] {
  if (!Array.isArray(reasons)) return [];
  return reasons
    .map((reason) => {
      if (reason && typeof reason === "object" && "code" in reason) {
        return String(reason.code);
      }
      return "";
    })
    .filter(Boolean)
    .slice(0, 3);
}

function subjectLabel(record: AbuseDecisionRecord) {
  if (record.userId) return `user #${record.userId}`;
  if (record.sessionId) return `session ${record.sessionId.slice(0, 10)}`;
  if (record.ipHash) return `ip ${record.ipHash.slice(0, 10)}`;
  if (record.deviceHash) return `device ${record.deviceHash.slice(0, 10)}`;
  return "-";
}

export default function AdminAbuseLogs() {
  const queryClient = useQueryClient();
  const [limit, setLimit] = useState("50");
  const [target, setTarget] = useState<AbuseDecisionRecord | null>(null);
  const [logAction, setLogAction] = useState<LogAction>("confirmed_abuse");
  const [note, setNote] = useState("");

  const { data, isFetching } = useQuery<{ decisions: AbuseDecisionRecord[] }>({
    queryKey: ["admin-abuse-decisions", limit],
    queryFn: () => fetch(`/api/admin/abuse/decisions?limit=${limit}`).then((r) => r.json()),
    staleTime: 10_000,
  });
  const decisions = useMemo(() => data?.decisions ?? [], [data?.decisions]);
  const loggedCount = useMemo(
    () => decisions.filter((decision) => decision.logs.length > 0).length,
    [decisions]
  );

  const logMutation = useMutation({
    mutationFn: () =>
      fetch("/api/admin/abuse/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: target?.requestId,
          action: logAction,
          note,
        }),
      }).then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "기록 실패");
        return body as { log: AbuseAdminLog };
      }),
    onSuccess: () => {
      toast.success("처리 로그를 남겼습니다.");
      setTarget(null);
      setNote("");
      setLogAction("confirmed_abuse");
      queryClient.invalidateQueries({ queryKey: ["admin-abuse-decisions"] });
    },
    onError: (err: Error) => toast.error("기록 실패", { description: err.message }),
  });

  const openLogDialog = (record: AbuseDecisionRecord) => {
    setTarget(record);
    setNote("");
    setLogAction("confirmed_abuse");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span className="bg-muted text-muted-foreground inline-flex h-8 w-fit items-center rounded-full px-3 text-sm font-medium tabular-nums">
            탐지 {decisions.length}건
          </span>
          <span className="bg-muted text-muted-foreground inline-flex h-8 w-fit items-center rounded-full px-3 text-sm font-medium tabular-nums">
            기록 {loggedCount}건
          </span>
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <Select value={limit} onValueChange={(value) => value && setLimit(value)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25건</SelectItem>
              <SelectItem value="50">50건</SelectItem>
              <SelectItem value="100">100건</SelectItem>
              <SelectItem value="200">200건</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            aria-label="새로고침"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-abuse-decisions"] })}
          >
            <RefreshCw aria-hidden="true" className={isFetching ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      <Card className="ring-border/60 rounded-[22px] border-0 py-0 shadow-none ring-1">
        <CardContent className="p-0">
          {isFetching && decisions.length === 0 ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>탐지 시간</TableHead>
                    <TableHead>대상</TableHead>
                    <TableHead>액션</TableHead>
                    <TableHead>판정</TableHead>
                    <TableHead>사유</TableHead>
                    <TableHead>최근 로그</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {decisions.map((record) => {
                    const latestLog = record.logs[0];
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {formatDate(record.createdAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{subjectLabel(record)}</TableCell>
                        <TableCell className="whitespace-nowrap">{record.action}</TableCell>
                        <TableCell>
                          <Badge variant={DECISION_TONE[record.decision] ?? "secondary"}>
                            {record.decision} · {Math.round(record.score * 100)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="min-w-48">
                          <div className="flex flex-wrap gap-1">
                            {reasonCodes(record.reasons).map((code) => (
                              <Badge key={code} variant="outline">
                                {code}
                              </Badge>
                            ))}
                            {reasonCodes(record.reasons).length === 0 && (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-56">
                          {latestLog ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{ACTION_LABEL[latestLog.action]}</Badge>
                                <span className="text-muted-foreground text-xs">
                                  {formatDate(latestLog.createdAt)}
                                </span>
                              </div>
                              <p className="text-muted-foreground line-clamp-2 text-sm">
                                {latestLog.note}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">미기록</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openLogDialog(record)}>
                            <NotebookPen aria-hidden="true" />
                            기록
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {decisions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center">
                        <ShieldAlert
                          aria-hidden="true"
                          className="text-muted-foreground mx-auto mb-3 size-6"
                        />
                        <p className="font-medium">탐지된 어뷰징이 없어요</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>어뷰징 처리 기록</DialogTitle>
            <DialogDescription>
              {target?.requestId} · {target?.decision} · {target && Math.round(target.score * 100)}%
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="abuseLogAction">처리 상태</Label>
              <Select
                value={logAction}
                onValueChange={(value) => value && setLogAction(value as LogAction)}
              >
                <SelectTrigger id="abuseLogAction" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed_abuse">어뷰징 확인</SelectItem>
                  <SelectItem value="false_positive">오탐</SelectItem>
                  <SelectItem value="monitoring">모니터링</SelectItem>
                  <SelectItem value="resolved">처리 완료</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="abuseLogNote">메모</Label>
              <Textarea
                id="abuseLogNote"
                value={note}
                maxLength={2000}
                rows={5}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              닫기
            </Button>
            <Button
              disabled={!note.trim() || logMutation.isPending}
              onClick={() => logMutation.mutate()}
            >
              {logMutation.isPending ? "기록 중..." : "기록하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
