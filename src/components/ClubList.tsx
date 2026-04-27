"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { createTelemetryCollector } from "@/lib/abuse/telemetry/collector.client";
import type { ClientTelemetry } from "@/lib/abuse";

const PIN_STORAGE_KEY = "pinned_clubs";
const MAX_PINS = 3;

interface Club {
  id: number;
  name: string;
  description: string;
  grade1Capacity: number;
  grade23Capacity: number;
  isOpen: boolean;
  _count: { enrollments: number };
  gradeEnrollments: { grade1: number; grade23: number };
}

interface Settings {
  id: number;
  openAt: Date | null;
  enrollmentEnabled: boolean;
}

interface EnrollmentChallenge {
  type: "delay" | "captcha" | "re_auth" | "email_verification" | "admin_review";
  token: string;
  expiresAt: number;
  payload?: { waitMs?: number; question?: string };
}

interface EnrollmentPayload {
  clubId: number;
  telemetry: ClientTelemetry;
  challengeToken?: string;
  challengeType?: EnrollmentChallenge["type"];
  challengeResponse?: unknown;
}

async function submitEnrollment(payload: EnrollmentPayload): Promise<number> {
  const res = await fetch("/api/enrollments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  if (res.status === 428 && data.error === "challenge_required" && data.challenge) {
    const challenge = data.challenge as EnrollmentChallenge;
    const challengeResponse = await solveChallenge(challenge);
    return submitEnrollment({
      ...payload,
      challengeToken: challenge.token,
      challengeType: challenge.type,
      challengeResponse,
    });
  }

  if (!res.ok) throw new Error(data.error ?? "오류가 발생했습니다.");
  return payload.clubId;
}

async function solveChallenge(challenge: EnrollmentChallenge): Promise<unknown> {
  if (challenge.type === "delay") {
    await new Promise((resolve) => setTimeout(resolve, challenge.payload?.waitMs ?? 2_000));
    return { waited: true };
  }

  if (challenge.type === "captcha") {
    const answer = window.prompt(`${challenge.payload?.question ?? ""} = ?`);
    return { answer };
  }

  throw new Error("추가 인증이 필요한 요청입니다.");
}

export default function ClubList({
  isLoggedIn,
  initialClubs,
  initialSettings,
}: {
  isLoggedIn: boolean;
  initialClubs: Club[];
  initialSettings: Settings;
}) {
  const queryClient = useQueryClient();
  const telemetry = useMemo(() => createTelemetryCollector(), []);
  const [now, setNow] = useState(() => new Date());
  const [pinnedIds, setPinnedIds] = useState<number[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(PIN_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    telemetry.reset();
    return telemetry.attach(document);
  }, [isLoggedIn, telemetry]);

  const { data: me } = useQuery<{ grade: number | null } | null>({
    queryKey: ["me"],
    queryFn: () =>
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((data) => data.user ?? null),
    staleTime: 5 * 60_000,
    enabled: isLoggedIn,
  });
  const userGrade = me?.grade ?? null;

  const { data: clubs = [], isLoading: clubsLoading } = useQuery<Club[]>({
    queryKey: ["clubs"],
    queryFn: () => fetch("/api/clubs").then((r) => r.json()),
    initialData: initialClubs,
    staleTime: 30_000,
  });

  const { data: enrolledIds = new Set<number>() } = useQuery<Set<number>>({
    queryKey: ["enrollments"],
    queryFn: () =>
      fetch("/api/enrollments")
        .then((r) => r.json())
        .then((data: { clubId: number }[]) => new Set(data.map((e) => e.clubId))),
    enabled: isLoggedIn,
    staleTime: 30_000,
  });

  const { data: settings } = useQuery<{ openAt: string | null }>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
    initialData: {
      ...initialSettings,
      openAt: initialSettings.openAt
        ? typeof initialSettings.openAt === "string"
          ? initialSettings.openAt
          : (initialSettings.openAt as Date).toISOString()
        : null,
    },
    staleTime: 60_000,
    select: (data) => ({ openAt: data.openAt ?? null }),
  });

  const globalOpenAt = settings?.openAt ?? null;

  const enrollMutation = useMutation({
    mutationFn: submitEnrollment,
    onMutate: async ({ clubId }) => {
      await queryClient.cancelQueries({ queryKey: ["clubs"] });
      const prevClubs = queryClient.getQueryData<Club[]>(["clubs"]);
      queryClient.setQueryData<Club[]>(["clubs"], (old = []) =>
        old.map((c) =>
          c.id === clubId
            ? {
                ...c,
                _count: { enrollments: c._count.enrollments + 1 },
                gradeEnrollments: {
                  ...c.gradeEnrollments,
                  ...(userGrade === 1 && { grade1: c.gradeEnrollments.grade1 + 1 }),
                  ...((userGrade === 2 || userGrade === 3) && {
                    grade23: c.gradeEnrollments.grade23 + 1,
                  }),
                },
              }
            : c
        )
      );
      queryClient.setQueryData<Set<number>>(["enrollments"], (old = new Set()) => {
        const next = new Set(old);
        next.add(clubId);
        return next;
      });
      return { prevClubs };
    },
    onError: (err, _variables, ctx) => {
      if (ctx?.prevClubs) queryClient.setQueryData(["clubs"], ctx.prevClubs);
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      toast.error("신청 실패", { description: err.message });
    },
    onSuccess: () => {
      toast.success("신청 완료!", { description: "동아리 신청이 완료되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      telemetry.reset();
    },
  });

  const togglePin = (clubId: number) => {
    setPinnedIds((prev) => {
      let next: number[];
      if (prev.includes(clubId)) {
        next = prev.filter((id) => id !== clubId);
      } else {
        if (prev.length >= MAX_PINS) {
          toast.error(`핀은 최대 ${MAX_PINS}개까지만 가능합니다.`);
          return prev;
        }
        next = [...prev, clubId];
      }
      localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleEnroll = (clubId: number) => {
    if (!isLoggedIn) {
      window.location.href = "/api/auth/login";
      return;
    }
    enrollMutation.mutate({ clubId, telemetry: telemetry.snapshot() });
  };

  if (clubsLoading) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-1 h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-12 text-center">
          등록된 동아리가 없습니다.
        </CardContent>
      </Card>
    );
  }

  const sortedClubs = [
    ...clubs.filter((c) => pinnedIds.includes(c.id)),
    ...clubs.filter((c) => !pinnedIds.includes(c.id)),
  ];

  return (
    <div className="grid gap-4">
      {sortedClubs.map((club) => {
        const isEnrolled = enrolledIds.has(club.id);
        const isNotOpenYet = !!globalOpenAt && now < new Date(globalOpenAt) && !club.isOpen;
        const isPinned = pinnedIds.includes(club.id);
        const isPending = enrollMutation.isPending && enrollMutation.variables?.clubId === club.id;

        const gradeCount =
          userGrade === 1
            ? club.gradeEnrollments.grade1
            : userGrade === 2 || userGrade === 3
              ? club.gradeEnrollments.grade23
              : null;

        const gradeCapacity =
          userGrade === 1
            ? club.grade1Capacity
            : userGrade === 2 || userGrade === 3
              ? club.grade23Capacity
              : null;

        const isGradeFull =
          gradeCapacity !== null &&
          gradeCapacity > 0 &&
          gradeCount !== null &&
          gradeCount >= gradeCapacity;
        const isGradeNotAllowed = gradeCapacity === 0;

        const disabled =
          isNotOpenYet || isEnrolled || isGradeFull || isGradeNotAllowed || isPending;

        const buttonLabel = isPending
          ? "처리중..."
          : isEnrolled
            ? "신청완료"
            : isNotOpenYet
              ? "신청 전"
              : isGradeNotAllowed
                ? "신청불가"
                : isGradeFull
                  ? "마감"
                  : "신청하기";

        const grades = [
          {
            label: "1학년",
            count: club.gradeEnrollments.grade1,
            capacity: club.grade1Capacity,
            isMyGrade: userGrade === 1,
          },
          {
            label: "2·3학년",
            count: club.gradeEnrollments.grade23,
            capacity: club.grade23Capacity,
            isMyGrade: userGrade === 2 || userGrade === 3,
          },
        ];

        return (
          <Card key={club.id} className={isPinned ? "border-primary/50" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {club.name}
                    {isNotOpenYet && <Badge variant="outline">신청 전</Badge>}
                    {isEnrolled && <Badge>신청완료</Badge>}
                  </CardTitle>
                  <CardDescription>{club.description}</CardDescription>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => togglePin(club.id)}
                    className={`rounded-md p-1.5 transition-colors ${
                      isPinned ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                    title={isPinned ? "핀 해제" : "상단 고정"}
                  >
                    <Pin className="h-4 w-4" fill={isPinned ? "currentColor" : "none"} />
                  </button>
                  <Button
                    size="sm"
                    variant={isEnrolled ? "secondary" : disabled ? "outline" : "default"}
                    disabled={disabled}
                    onClick={() => handleEnroll(club.id)}
                  >
                    {buttonLabel}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {grades.map(({ label, count, capacity, isMyGrade }) => {
                  if (capacity === 0) return null;
                  const pct = Math.round((count / capacity) * 100);
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <span
                        className={`w-12 shrink-0 text-xs ${isMyGrade ? "text-foreground font-semibold" : "text-muted-foreground"}`}
                      >
                        {label}
                      </span>
                      <Progress value={pct} className="h-1.5 flex-1" />
                      <span
                        className={`shrink-0 text-xs tabular-nums ${isMyGrade ? "text-foreground font-semibold" : "text-muted-foreground"}`}
                      >
                        {count} / {capacity}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
