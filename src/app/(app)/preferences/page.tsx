import { redirect } from "next/navigation";
import { MandatePreferenceField } from "@/features/preferences/components/mandate-preference-field";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Préférences — BSTAY PRO" };

/**
 * The signed-in user's own preferences.
 *
 * Distinct from Paramètres, which is the agency's configuration and is gated
 * on MANAGE_USERS. Nothing here needs a permission: these choices affect only
 * what the person sees, and grant nothing. Anyone with an account has a page.
 */
export default async function PreferencesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Préférences</h2>
        <p className="text-muted-foreground text-sm">
          Vos réglages personnels. Ils ne concernent que votre affichage et ne
          modifient rien pour vos collègues.
        </p>
      </div>

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Mandats affichés</h3>
          <p className="text-muted-foreground text-sm">
            L&apos;agence gère principalement des locations saisonnières&nbsp;;
            les mandats de vente sont l&apos;exception.
          </p>
        </div>

        <MandatePreferenceField initialValue={user.mandatePreference} />
      </section>
    </div>
  );
}
