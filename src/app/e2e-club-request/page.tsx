import { notFound } from "next/navigation";
import ClubRequestDialog from "@/components/ClubRequestDialog";
import E2eHydrationMarker from "@/components/E2eHydrationMarker";

export default function E2eClubRequestPage() {
  if (process.env.E2E_HARNESS !== "1") notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <E2eHydrationMarker />
      <h1 className="mb-4 text-2xl font-bold">Club Request Harness</h1>
      <ClubRequestDialog isLoggedIn />
    </main>
  );
}
