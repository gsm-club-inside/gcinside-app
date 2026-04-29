"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default function ClubRequestDialog({ isLoggedIn }: { isLoggedIn: boolean }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: requests = [], isLoading } = useQuery<ClubCreationRequest[]>({
    queryKey: ["club-requests"],
    queryFn: () => fetch("/api/club-requests").then((r) => r.json()),
    enabled: isLoggedIn && isDialogOpen,
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
      toast.success("동아리 생성 요청을 보냈어요", {
        description: "검토 상태는 생성 요청 창에서 확인할 수 있어요.",
      });
      setForm(emptyForm);
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["club-requests"] });
    },
    onError: (err: Error) =>
      toast.error("요청을 보내지 못했어요", {
        description: `${err.message} 입력한 내용을 확인한 뒤 다시 시도해 주세요.`,
      }),
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
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleOpenRequest}
        className="gc-pressable"
      >
        <Plus data-icon="inline-start" />
        <span className="hidden sm:inline">자율동아리 생성</span>
        <span className="sm:hidden">생성</span>
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>새 동아리 개설을 요청할까요?</DialogTitle>
            <DialogDescription>
              검토에 필요한 정보만 간단히 입력해 주세요. 승인되면 목록에 동아리가 표시됩니다.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
              <div className="space-y-1.5">
                <Label htmlFor="request-name">동아리명</Label>
                <Input
                  id="request-name"
                  required
                  placeholder="예: 댄스부"
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
                    placeholder="1학년"
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
                    placeholder="2·3학년"
                    value={form.grade23Capacity}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, grade23Capacity: Number(e.target.value) }))
                    }
                    disabled={!isLoggedIn}
                  />
                </div>
                <p className="text-muted-foreground mt-1.5 text-xs">왼쪽 1학년, 오른쪽 2·3학년</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="request-description">설명</Label>
              <Textarea
                id="request-description"
                required
                rows={4}
                className="resize-none"
                placeholder="어떤 활동을 언제, 누구와 함께 하는지 적어주세요."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                disabled={!isLoggedIn}
              />
            </div>

            {isLoggedIn && (
              <div className="border-t pt-4">
                <h3 className="mb-3 text-sm font-medium">내 요청</h3>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : latestRequests.length === 0 ? (
                  <p className="text-muted-foreground bg-muted/50 rounded-lg px-3 py-3 text-sm">
                    아직 보낸 생성 요청이 없어요.
                  </p>
                ) : (
                  <div className="space-y-2" aria-label="최근 생성 요청">
                    {latestRequests.map((request) => (
                      <div
                        key={request.id}
                        className="gc-enter rounded-lg border px-3 py-2 text-sm"
                      >
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
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="gc-pressable"
              >
                돌아가기
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="gc-pressable">
                {createMutation.isPending && (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                )}
                {createMutation.isPending ? "요청 중" : "요청하기"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
