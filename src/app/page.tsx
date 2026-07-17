import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();

  // proxy.ts already turns away unauthenticated requests. This covers
  // the case it can't see: authenticated with Google but holding no
  // profile row, which would otherwise render an empty page with no
  // explanation.
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col justify-center gap-8 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">BSTAY PRO</h1>
        <p className="text-muted-foreground text-sm">
          Connecté en tant que {user.fullName}
        </p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Email</dt>
        <dd>{user.email}</dd>
        <dt className="text-muted-foreground">Rôle</dt>
        <dd>{user.role}</dd>
      </dl>

      <form action="/auth/signout" method="post">
        <Button type="submit" variant="outline">
          Se déconnecter
        </Button>
      </form>
    </main>
  );
}
