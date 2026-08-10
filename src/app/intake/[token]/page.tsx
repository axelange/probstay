import { notFound } from "next/navigation";
import { IntakeForm } from "@/features/intake/components/intake-form";
import { resolveIntake } from "@/features/intake/services/intake-service";

export const metadata = {
  title: "Vos informations — BSTAY",
  // A client's identification form has no business in a search index, and the
  // token is in the path.
  robots: { index: false, follow: false },
};

/**
 * The one page a client reaches, and the only one outside the signed-in app.
 *
 * There is no session here: the token in the URL is the whole credential, and
 * proxy.ts lets this path through unauthenticated for exactly that reason.
 * Everything shown is resolved from the token server-side — nothing about
 * which contact this is ever travels in a query string or a form field.
 *
 * A token that is unknown, expired or revoked renders the same 404 as a typo.
 * Telling a visitor which of those it was would let someone probing tokens
 * learn which ones exist.
 */
export default async function IntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resolved = await resolveIntake(token);
  if (!resolved) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <IntakeForm token={token} prefill={resolved.prefill} />
    </main>
  );
}
