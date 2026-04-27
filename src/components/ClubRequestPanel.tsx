"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

interface ClubCreationRequest {
  id: number;
  name: string;
  description: string;
  grade1Capacity: number;
  grade23Capacity: number;
  isOpen: boolean;
  status: RequestStatus;
  rejectionReason: string | null;
  createdAt: string;
  club: { id: number; name: string } | null;
}

const emptyForm = {
  name: "",
  description: "",
  grade1Capacity: 0,
  grade23Capacity: 0,
  isOpen: true,
};

const statusLabel: Record<RequestStatus, string> = {
  PENDING: "검토중",
  APPROVED: "승인됨",
  REJECTED: "거절됨",
};

const statusVariant: Record<RequestStatus, "default" | "secondary" | "destructive"> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
};

export default function ClubRequestPanel({ isLoggedIn }: { isLoggedIn: boolean }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: requests = [], isLoading } = useQuery<ClubCreationRequest[]>({
    queryKey: ["club-requests"],
    queryFn: () => fetch("/api/club-requests").then((r) => r.json()),
    enabled: isLoggedIn,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof emptyForm) =>
      fetch("/api/club-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "요청을 저장하지 못했습니다.");
        return data;
      }),
    onSuccess: () => {
      toast.success("동아리 생성 요청을 보냈습니다.");
      setForm(emptyForm);
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["club-requests"] });
    },
    onError: (err: Error) => toast.error("요청 실패", { description: err.message }),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      window.location.href = "/api/auth/login";
      return;
    }
    createMutation.mutate(form);
  };

  const handleOpenRequest = () => {
    if (!isLoggedIn) {
      window.location.href = "/api/auth/login";
      return;
    }
    setIsDialogOpen(true);
  };

  const latestRequests = requests.slice(0, 3);

  return (
    <>
      <Card className="mb-8">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="space-y-1">
              <h2 className="text-base font-semibold">자율동아리 생성</h2>
              <p className="text-muted-foreground text-sm">
                동아리 정보를 제출하면 관리자가 검토 후 승인합니다.
              </p>
            </div>

            {isLoggedIn && isLoading ? (
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-9 w-36" />
                <Skeleton className="h-9 w-32" />
              </div>
            ) : isLoggedIn && latestRequests.length === 0 ? (
              <p className="text-muted-foreground text-sm">아직 보낸 생성 요청이 없습니다.</p>
            ) : isLoggedIn ? (
              <div className="flex flex-wrap gap-2">
                {latestRequests.map((request) => (
                  <div key={request.id} className="max-w-full rounded-lg border px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{request.name}</span>
                      <Badge variant={statusVariant[request.status]}>
                        {statusLabel[request.status]}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {new Date(request.createdAt).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                    {request.rejectionReason && (
                      <p className="text-destructive mt-1 text-xs">
                        거절 사유: {request.rejectionReason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <Button type="button" className="w-full sm:w-auto" onClick={handleOpenRequest}>
            <Plus data-icon="inline-start" />
            {isLoggedIn ? "생성 요청" : "로그인 후 요청"}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>자율동아리 생성 요청</DialogTitle>
            <DialogDescription>검토에 필요한 동아리 정보를 입력해주세요.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
              <div className="space-y-1.5">
                <Label htmlFor="request-name">동아리명</Label>
                <Input
                  id="request-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  disabled={!isLoggedIn}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">학년별 정원</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    aria-label="1학년 정원"
                    type="number"
                    min={0}
                    required
                    value={form.grade1Capacity}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, grade1Capacity: Number(e.target.value) }))
                    }
                    disabled={!isLoggedIn}
                  />
                  <Input
                    aria-label="2·3학년 정원"
                    type="number"
                    min={0}
                    required
                    value={form.grade23Capacity}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, grade23Capacity: Number(e.target.value) }))
                    }
                    disabled={!isLoggedIn}
                  />
                </div>
                <p className="text-muted-foreground mt-1.5 text-xs">
                  왼쪽 1학년, 오른쪽 2·3학년
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="request-description">설명</Label>
              <Textarea
                id="request-description"
                required
                rows={4}
                className="resize-none"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                disabled={!isLoggedIn}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                취소
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "요청 중..." : "요청하기"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
