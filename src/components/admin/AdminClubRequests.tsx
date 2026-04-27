"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  requester: {
    name: string;
    studentNumber: number | null;
    grade: number | null;
    classNum: number | null;
    number: number | null;
  };
  reviewer: { name: string } | null;
  club: { id: number; name: string } | null;
}

const statusLabel: Record<RequestStatus, string> = {
  PENDING: "대기",
  APPROVED: "승인",
  REJECTED: "거절",
};

const statusVariant: Record<RequestStatus, "default" | "secondary" | "destructive"> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
};

function requesterLabel(request: ClubCreationRequest) {
  const { requester } = request;
  const detail =
    requester.grade && requester.classNum && requester.number
      ? `${requester.grade}-${requester.classNum} ${requester.number}번`
      : requester.studentNumber
        ? String(requester.studentNumber)
        : "학번 없음";
  return `${requester.name} · ${detail}`;
}

export default function AdminClubRequests() {
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<ClubCreationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: requests = [], isLoading } = useQuery<ClubCreationRequest[]>({
    queryKey: ["admin-club-requests"],
    queryFn: () => fetch("/api/admin/club-requests").then((r) => r.json()),
    staleTime: 15_000,
  });

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === "PENDING").length,
    [requests]
  );

  const reviewMutation = useMutation({
    mutationFn: ({
      requestId,
      action,
      reason,
    }: {
      requestId: number;
      action: "approve" | "reject";
      reason?: string;
    }) =>
      fetch(`/api/admin/club-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason: reason }),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "요청을 처리하지 못했습니다.");
        return data;
      }),
    onSuccess: (_, variables) => {
      toast.success(variables.action === "approve" ? "승인되었습니다." : "거절되었습니다.");
      setRejectTarget(null);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-club-requests"] });
      queryClient.invalidateQueries({ queryKey: ["club-requests"] });
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
    },
    onError: (err: Error) => toast.error("처리 실패", { description: err.message }),
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">동아리 생성 요청</h2>
        <Badge variant={pendingCount > 0 ? "default" : "secondary"}>{pendingCount}건 대기</Badge>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>동아리</TableHead>
                  <TableHead>요청자</TableHead>
                  <TableHead>정원</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">심사</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="font-medium">{request.name}</div>
                      <div className="text-muted-foreground line-clamp-2 text-xs">
                        {request.description}
                      </div>
                      {request.rejectionReason && (
                        <div className="text-destructive mt-1 text-xs">
                          사유: {request.rejectionReason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {requesterLabel(request)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      1학년 {request.grade1Capacity}명 · 2·3학년 {request.grade23Capacity}명
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[request.status]}>
                        {statusLabel[request.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      {request.status === "PENDING" ? (
                        <>
                          <Button
                            size="sm"
                            disabled={reviewMutation.isPending}
                            onClick={() =>
                              reviewMutation.mutate({
                                requestId: request.id,
                                action: "approve",
                              })
                            }
                          >
                            승인
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={reviewMutation.isPending}
                            onClick={() => setRejectTarget(request)}
                          >
                            거절
                          </Button>
                        </>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {request.reviewer?.name ?? "처리됨"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {requests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                      접수된 동아리 생성 요청이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectionReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>생성 요청 거절</DialogTitle>
            <DialogDescription>
              <strong>&quot;{rejectTarget?.name}&quot;</strong> 요청을 거절하는 사유를 남겨주세요.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            className="resize-none"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="거절 사유"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectionReason("");
              }}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectionReason.trim() || reviewMutation.isPending}
              onClick={() =>
                rejectTarget &&
                reviewMutation.mutate({
                  requestId: rejectTarget.id,
                  action: "reject",
                  reason: rejectionReason,
                })
              }
            >
              거절
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
