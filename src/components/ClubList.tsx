"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Clock3, LoaderCircle, LogIn, Pin, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { createTelemetryCollector } from "@/lib/abuse/telemetry/collector.client";
import type { ClientTelemetry } from "@/lib/abuse";
import { apiUrl } from "@/lib/client-api";
import { cn } from "@/lib/utils";

const PIN_STORAGE_KEY = "pinned_clubs";
const MAX_PINS = 3;

const formatOpenAt = (value: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

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
  const res = await fetch(apiUrl("/api/enrollments"), {
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
  initialUserGrade,
  initialClubs,
  initialSettings,
}: {
  isLoggedIn: boolean;
  initialUserGrade?: number | null;
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
    const detachTelemetry = telemetry.attach(document);
    if (process.env.NEXT_PUBLIC_E2E_HARNESS === "1") {
      document.documentElement.dataset.e2eHydrated = "true";
    }
    return () => {
      delete document.documentElement.dataset.e2eHydrated;
      detachTelemetry();
    };
  }, [isLoggedIn, telemetry]);

  const { data: me } = useQuery<{ grade: number | null } | null>({
    queryKey: ["me-grade"],
    queryFn: () =>
      fetch(apiUrl("/api/auth/me"))
        .then((r) => r.json())
        .then((data) => data.user ?? null),
    initialData:
      initialUserGrade !== undefined
        ? {
            grade: initialUserGrade,
          }
        : undefined,
    staleTime: 5 * 60_000,
    enabled: isLoggedIn,
  });
  const userGrade = me?.grade ?? null;

  const { data: clubs = [], isLoading: clubsLoading } = useQuery<Club[]>({
    queryKey: ["clubs"],
    queryFn: () => fetch(apiUrl("/api/clubs")).then((r) => r.json()),
    initialData: initialClubs,
    staleTime: 30_000,
  });

  const { data: enrolledIds = new Set<number>() } = useQuery<Set<number>>({
    queryKey: ["enrollments"],
    queryFn: () =>
      fetch(apiUrl("/api/enrollments"))
        .then((r) => r.json())
        .then((data: { clubId: number }[]) => new Set(data.map((e) => e.clubId))),
    enabled: isLoggedIn,
    staleTime: 30_000,
  });

  const { data: settings } = useQuery<{ openAt: string | null }>({
    queryKey: ["settings"],
    queryFn: () => fetch(apiUrl("/api/settings")).then((r) => r.json()),
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
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["clubs"] }),
        queryClient.cancelQueries({ queryKey: ["enrollments"] }),
      ]);
      const prevClubs = queryClient.getQueryData<Club[]>(["clubs"]);
      const prevEnrolledIds = queryClient.getQueryData<Set<number>>(["enrollments"]);
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
      return { prevClubs, prevEnrolledIds };
    },
    onError: (err, _variables, ctx) => {
      if (ctx?.prevClubs) queryClient.setQueryData(["clubs"], ctx.prevClubs);
      if (ctx?.prevEnrolledIds) queryClient.setQueryData(["enrollments"], ctx.prevEnrolledIds);
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      toast.error("신청하지 못했어요", {
        description: `${err.message} 잠시 후 다시 시도해 주세요.`,
      });
    },
    onSuccess: () => {
      toast.success("신청이 완료됐어요", {
        description: "내 프로필에서 신청한 동아리를 확인할 수 있어요.",
      });
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
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
          toast.error(`관심 동아리는 ${MAX_PINS}개까지 고정할 수 있어요.`);
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
      <div className="grid gap-3" aria-label="동아리 목록을 불러오는 중">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-card rounded-[22px] border-0 py-0 shadow-none ring-0">
            <CardHeader className="px-5 pt-4 pb-0 sm:px-6 sm:pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                  <Skeleton className="h-[25.5px] w-36 rounded-lg" />
                  <Skeleton className="h-[21px] w-full max-w-60 rounded-lg" />
                  <Skeleton className="h-[21px] w-40 rounded-lg sm:hidden" />
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Skeleton className="size-9 rounded-full" />
                  <Skeleton className="h-8 w-24 rounded-full" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pt-4 pb-5 sm:px-6 sm:pt-4 sm:pb-6">
              <div className="space-y-3.5">
                {[1, 2].map((grade) => (
                  <div key={grade} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <Skeleton className="h-[18px] w-12 rounded-md" />
                      <Skeleton className="h-[18px] w-8 rounded-md" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <Card className="bg-card rounded-2xl border-0 py-0 shadow-none ring-0">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="bg-muted mb-4 flex size-10 items-center justify-center rounded-full">
            <Search className="text-muted-foreground size-5" aria-hidden="true" />
          </div>
          <p className="font-medium">아직 신청할 동아리가 없어요</p>
          <p className="text-muted-foreground mt-1 text-sm">
            동아리가 등록되면 이곳에서 바로 신청할 수 있어요.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sortedClubs = [
    ...clubs.filter((c) => pinnedIds.includes(c.id)),
    ...clubs.filter((c) => !pinnedIds.includes(c.id)),
  ];

  return (
    <div className="grid gap-3">
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
        const remaining =
          gradeCapacity !== null && gradeCount !== null
            ? Math.max(gradeCapacity - gradeCount, 0)
            : null;

        const disabled =
          isNotOpenYet || isEnrolled || isGradeFull || isGradeNotAllowed || isPending;

        const buttonLabel = isPending
          ? "신청 중"
          : !isLoggedIn
            ? "로그인하고 신청"
            : isEnrolled
              ? "신청완료"
              : isNotOpenYet
                ? "신청 전"
                : isGradeNotAllowed
                  ? "신청불가"
                  : isGradeFull
                    ? "마감"
                    : "신청하기";

        const status = !isLoggedIn
          ? {
              icon: LogIn,
              label: "로그인 필요",
              tone: "text-muted-foreground",
              message: "로그인하면 내 학년에 맞춰 신청할 수 있어요.",
            }
          : isEnrolled
            ? {
                icon: CheckCircle2,
                label: "신청 완료",
                tone: "text-primary",
                message: "이미 신청한 동아리예요.",
              }
            : isNotOpenYet
              ? {
                  icon: Clock3,
                  label: "신청 대기",
                  tone: "text-muted-foreground",
                  message: globalOpenAt
                    ? `${formatOpenAt(globalOpenAt)}부터 신청할 수 있어요.`
                    : "아직 신청 시간이 아니에요...",
                }
              : isGradeNotAllowed
                ? {
                    icon: AlertCircle,
                    label: "신청 불가",
                    tone: "text-muted-foreground",
                    message: "내 학년은 모집하지 않는 동아리예요.",
                  }
                : isGradeFull
                  ? {
                      icon: AlertCircle,
                      label: "마감",
                      tone: "text-muted-foreground",
                      message: "내 학년 정원이 모두 찼어요.",
                    }
                  : {
                      icon: CheckCircle2,
                      label: "신청 가능",
                      tone: "text-primary",
                      message:
                        remaining === null
                          ? "로그인하면 내 학년에 맞춰 신청할 수 있어요."
                          : `내 학년 기준 ${remaining}자리 남았어요.`,
                    };

        const StatusIcon = status.icon;

        const grades = [
          {
            label: "1학년",
            count: club.gradeEnrollments.grade1,
            capacity: club.grade1Capacity,
            isMyGrade: isLoggedIn && userGrade === 1,
          },
          {
            label: "2·3학년",
            count: club.gradeEnrollments.grade23,
            capacity: club.grade23Capacity,
            isMyGrade: isLoggedIn && (userGrade === 2 || userGrade === 3),
          },
        ];

        return (
          <Card
            key={club.id}
            className={cn(
              "gc-enter bg-card rounded-[22px] border-0 py-0 shadow-none ring-0 transition-[box-shadow,transform,background-color] duration-200",
              isPinned &&
                "dark:bg-secondary/20 dark:ring-secondary bg-[#f7fbff] ring-2 ring-[#c9e2ff]"
            )}
          >
            <CardHeader className="px-5 pt-4 pb-0 sm:px-6 sm:pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-[17px] leading-[25.5px] font-bold">
                    {club.name}
                    {isNotOpenYet && <Badge variant="outline">신청 전</Badge>}
                    {isEnrolled && <Badge>신청완료</Badge>}
                  </CardTitle>
                  <CardDescription className="text-[14px] leading-[21px]">
                    {club.description}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => togglePin(club.id)}
                    className={cn(
                      "gc-pressable flex size-9 items-center justify-center rounded-full transition-colors",
                      isPinned
                        ? "text-primary dark:bg-secondary bg-[#e8f3ff]"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    title={isPinned ? "핀 해제" : "상단 고정"}
                    aria-label={isPinned ? `${club.name} 상단 고정 해제` : `${club.name} 상단 고정`}
                  >
                    <Pin className="h-4 w-4" fill={isPinned ? "currentColor" : "none"} />
                  </button>
                  <Button
                    size="sm"
                    variant={isEnrolled ? "secondary" : disabled ? "outline" : "default"}
                    disabled={disabled}
                    onClick={() => handleEnroll(club.id)}
                    className="gc-pressable min-w-[96px] rounded-full px-3.5"
                  >
                    {isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
                    {buttonLabel}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pt-4 pb-5 sm:px-6 sm:pt-4 sm:pb-6">
              {isLoggedIn && (
                <div className="dark:bg-muted flex items-start gap-2 rounded-2xl bg-[#f9fafb] px-4 py-3">
                  <StatusIcon
                    className={cn("mt-0.5 size-4 shrink-0", status.tone)}
                    aria-hidden="true"
                  />
                  <p className="text-[14px] leading-[21px]">{status.message}</p>
                </div>
              )}

              <div className="space-y-3.5">
                {grades.map(({ label, count, capacity, isMyGrade }) => {
                  if (capacity === 0) return null;
                  const pct = Math.min(Math.round((count / capacity) * 100), 100);
                  const isDisabledGrade = isLoggedIn && !isMyGrade;
                  return (
                    <div key={label} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={cn(
                            "text-[12px] leading-[18px]",
                            isMyGrade
                              ? "text-foreground font-semibold"
                              : "text-muted-foreground font-medium"
                          )}
                        >
                          {label}
                          {isMyGrade && <span className="ml-1 text-[11px]">(내 학년)</span>}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-[12px] leading-[18px] tabular-nums",
                            isMyGrade ? "text-foreground font-semibold" : "text-muted-foreground"
                          )}
                        >
                          {count} / {capacity}
                        </span>
                      </div>
                      <Progress
                        value={pct}
                        className="h-1.5"
                        trackClassName="h-1.5 bg-[#f2f4f6] dark:bg-muted"
                        indicatorClassName={cn(
                          "bg-[#4593fc] dark:bg-primary",
                          isDisabledGrade && "bg-[#d1d6db] dark:bg-[#4e5968]"
                        )}
                        aria-label={`${label} 신청 현황`}
                      />
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
