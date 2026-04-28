import { notFound } from "next/navigation";
import ClubList from "@/components/ClubList";

export default function MacroHarnessPage() {
  if (process.env.E2E_HARNESS !== "1") notFound();

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-1 text-2xl font-bold">Macro Harness</h1>
      <p className="text-muted-foreground mb-6 text-sm">Playwright abuse orchestration target.</p>
      <ClubList
        isLoggedIn
        initialUserGrade={1}
        initialSettings={{ id: 1, openAt: null, enrollmentEnabled: true }}
        initialClubs={[
          {
            id: 101,
            name: "무지개 같은 아이들",
            description: "테스트용 동아리",
            grade1Capacity: 3,
            grade23Capacity: 3,
            isOpen: true,
            _count: { enrollments: 0 },
            gradeEnrollments: { grade1: 0, grade23: 0 },
          },
        ]}
      />
    </main>
  );
}
