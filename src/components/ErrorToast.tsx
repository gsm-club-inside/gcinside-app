"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const errorMessages: Record<string, string> = {
  invalid_state: "보안 검증에 실패했습니다. 다시 시도해주세요.",
  missing_code: "인증 코드가 없습니다. 다시 시도해주세요.",
  auth_failed: "로그인에 실패했습니다. 다시 시도해주세요.",
  forbidden: "접근 권한이 없습니다.",
};

export default function ErrorToast({ error }: { error?: string }) {
  useEffect(() => {
    if (error) {
      toast.error(errorMessages[error] ?? "오류가 발생했습니다.");
    }
  }, [error]);

  return null;
}
