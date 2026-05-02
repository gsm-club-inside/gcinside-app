"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

const FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});

const HEADING_CLASS = "text-2xl leading-tight font-bold sm:text-3xl";

export default function EnrollmentHeading({
  openAt,
  children,
}: {
  openAt: string | null;
  children?: ReactNode;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!openAt) return;
    const tick = () => setNow(Date.now());
    const rafId = requestAnimationFrame(tick);
    const intervalId = setInterval(tick, 1000);
    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(intervalId);
    };
  }, [openAt]);

  const target = openAt ? new Date(openAt).getTime() : null;
  const diff = target !== null && now !== null ? target - now : -1;
  const showCountdown = target !== null && now !== null && diff > 0;
  const isUpcoming = target !== null && (now === null || target > now);

  if (!showCountdown) {
    return (
      <>
        <h1 className={HEADING_CLASS}>지금 신청할 동아리를 선택하세요</h1>
        {!isUpcoming && children}
      </>
    );
  }

  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const startText = FORMATTER.format(new Date(target!));

  return (
    <div className="space-y-1.5" aria-live="polite">
      <h1 className={HEADING_CLASS}>
        신청 시작까지{" "}
        <span className="text-primary tabular-nums">
          {days > 0 && `${days}일 `}
          {pad(hours)}:{pad(minutes)}:{pad(seconds)}
        </span>
      </h1>
      <p className="text-muted-foreground text-sm">{startText}에 시작돼요</p>
    </div>
  );
}
