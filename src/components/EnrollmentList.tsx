"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
      toast.success("신청이 취소되었습니다.");
      router.refresh();
    } catch {
      toast.error("취소에 실패했습니다.");
    } finally {
      setPendingId(null);
      setConfirmId(null);
    }
  }

  if (enrollments.length === 0) {
    return (
      <div className="bg-card text-muted-foreground rounded-xl border p-8 text-center text-sm">
        아직 신청한 동아리가 없어요.{" "}
        <Link href="/" className="text-primary underline underline-offset-4">
          동아리를 둘러보세요.
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
            className="bg-card flex items-center justify-between rounded-xl border p-4"
          >
            <div>
              <p className="font-medium">{enrollment.club.name}</p>
              <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                {enrollment.club.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">신청완료</Badge>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmId(enrollment.id)}
                disabled={pendingId === enrollment.id}
              >
                {pendingId === enrollment.id ? "취소 중..." : "취소"}
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
              신청이 취소됩니다. 이 작업은 되돌릴 수 없습니다.
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
