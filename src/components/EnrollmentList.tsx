"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Enrollment {
  id: number;
  club: {
    name: string;
    description: string;
  };
}

export default function EnrollmentList({
  initialEnrollments,
}: {
  initialEnrollments: Enrollment[];
}) {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  async function handleCancel(id: number) {
    setPendingId(id);
    try {
      const res = await fetch(`/api/enrollments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setEnrollments((prev) => prev.filter((e) => e.id !== id));
      toast.success("신청을 취소했어요", {
        description: "다른 동아리를 다시 신청할 수 있어요.",
      });
      router.refresh();
    } catch {
      toast.error("취소하지 못했어요", {
        description: "네트워크 상태를 확인한 뒤 다시 시도해 주세요.",
      });
    } finally {
      setPendingId(null);
      setConfirmId(null);
    }
  }

  if (enrollments.length === 0) {
    return (
      <div className="bg-card flex flex-col items-center rounded-lg border p-8 text-center text-sm">
        <div className="bg-muted mb-4 flex size-10 items-center justify-center rounded-full">
          <CheckCircle2 className="text-muted-foreground size-5" aria-hidden="true" />
        </div>
        <p className="text-foreground font-medium">아직 신청한 동아리가 없어요</p>
        <p className="text-muted-foreground mt-1">
          마음에 드는 동아리를 찾으면 이곳에 신청 내역이 표시됩니다.
        </p>
        <Link href="/" className="mt-4 font-medium underline underline-offset-4">
          동아리 보러가기
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {enrollments.map((enrollment) => (
          <li
            key={enrollment.id}
            className="bg-card gc-enter flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{enrollment.club.name}</p>
                <Badge variant="secondary">신청완료</Badge>
              </div>
              <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                {enrollment.club.description}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmId(enrollment.id)}
                disabled={pendingId === enrollment.id}
                className="gc-pressable min-w-16"
              >
                {pendingId === enrollment.id && (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                )}
                {pendingId === enrollment.id ? "취소 중" : "취소"}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <AlertDialog
        open={confirmId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>신청을 취소할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmId !== null && enrollments.find((e) => e.id === confirmId)?.club.name} 동아리
              신청이 취소됩니다. 이후 정원이 남아 있으면 다시 신청할 수 있어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>돌아가기</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive/10 text-destructive hover:bg-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30"
              onClick={() => confirmId !== null && handleCancel(confirmId)}
            >
              취소하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
