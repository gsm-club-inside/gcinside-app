import { getCachedEnrollments } from "@/lib/queries";
import EnrollmentList from "@/components/EnrollmentList";

export default async function ProfileEnrollments({ userId }: { userId: number }) {
  const enrollments = await getCachedEnrollments(userId);

  return (
    <EnrollmentList
      initialEnrollments={enrollments.map((e) => ({
        id: e.id,
        club: { name: e.club.name, description: e.club.description },
      }))}
    />
  );
}
