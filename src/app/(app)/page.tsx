import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  // The layout has already established there is a user; this is only to
  // read them, not to guard the route.
  const user = await getCurrentUser();

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold tracking-tight">
        Bonjour {user?.fullName.split(" ")[0]}
      </h2>
      <p className="text-muted-foreground text-sm">
        Les indicateurs et l&apos;activité récente s&apos;afficheront ici.
      </p>
    </div>
  );
}
