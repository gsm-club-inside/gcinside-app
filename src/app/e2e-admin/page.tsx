import { notFound } from "next/navigation";
import AdminClubRequests from "@/components/admin/AdminClubRequests";
import E2eHydrationMarker from "@/components/E2eHydrationMarker";

export default function E2eAdminPage() {
  if (process.env.E2E_HARNESS !== "1") notFound();

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <E2eHydrationMarker />
      <h1 className="mb-4 text-2xl font-bold">Admin Harness</h1>
      <AdminClubRequests />
    </main>
  );
}
