import { notFound } from "next/navigation";
import EnrollmentList from "@/components/EnrollmentList";
import E2eHydrationMarker from "@/components/E2eHydrationMarker";

export default function E2eProfilePage() {
  if (process.env.E2E_HARNESS !== "1") notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <E2eHydrationMarker />
      <h1 className="mb-4 text-2xl font-bold">Profile Harness</h1>
      <EnrollmentList
        initialEnrollments={[
          { id: 11, club: { name: "밴드부", description: "음악 동아리" } },
          { id: 12, club: { name: "코딩부", description: "개발 동아리" } },
        ]}
      />
    </main>
  );
}
