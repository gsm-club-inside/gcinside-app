import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const TAGS = {
  users: "users",
  enrollments: "enrollments",
  clubs: "clubs",
  clubRequests: "club-requests",
  settings: "settings",
} as const;

export const getCachedUserProfile = unstable_cache(
  async (userId: number) =>
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        role: true,
        studentNumber: true,
        grade: true,
        classNum: true,
        number: true,
        major: true,
      },
    }),
  ["user-profile"],
  { tags: [TAGS.users] }
);

export const getCachedClubs = unstable_cache(
  async () => {
    const clubs = await prisma.club.findMany({
      orderBy: { createdAt: "asc" },
      include: { enrollments: { select: { user: { select: { grade: true } } } } },
    });
    return clubs.map(({ enrollments, ...club }) => ({
      ...club,
      _count: { enrollments: enrollments.length },
      gradeEnrollments: {
        grade1: enrollments.filter((e) => e.user.grade === 1).length,
        grade23: enrollments.filter((e) => e.user.grade === 2 || e.user.grade === 3).length,
      },
    }));
  },
  ["clubs"],
  { tags: [TAGS.clubs], revalidate: 10 }
);

export const getCachedSettings = unstable_cache(
  async () => prisma.settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} }),
  ["settings"],
  { tags: [TAGS.settings], revalidate: 60 }
);

export const getCachedEnrollments = unstable_cache(
  async (userId: number) =>
    prisma.enrollment.findMany({
      where: { userId },
      include: { club: { select: { name: true, description: true } } },
      orderBy: { enrolledAt: "asc" },
    }),
  ["user-enrollments"],
  { tags: [TAGS.enrollments] }
);
