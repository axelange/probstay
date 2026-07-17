import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { GoogleSignInButton } from "./google-sign-in-button";

export const metadata = { title: "Connexion — BSTAY PRO" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  if (await getCurrentUser()) {
    redirect("/");
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">BSTAY PRO</h1>
          <p className="text-muted-foreground text-sm">
            Application interne. Accès sur invitation.
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="border-destructive/50 text-destructive rounded-md border px-3 py-2 text-sm"
          >
            {error}
          </p>
        ) : null}

        <GoogleSignInButton />
      </div>
    </main>
  );
}
