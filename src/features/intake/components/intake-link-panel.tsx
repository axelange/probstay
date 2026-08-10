"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, Mail, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createIntakeLink } from "@/features/intake/actions/create-intake-link";
import { revokeIntakeLink } from "@/features/intake/actions/revoke-intake-link";
import { formatDate } from "@/features/rentals/components/rental-labels";

export type IntakeLinkRow = {
  id: string;
  token: string;
  expiresAt: Date;
  revokedAt: Date | null;
  submittedAt: Date | null;
  createdAt: Date;
  authorName: string | null;
  scope: "FULL" | "OCCUPANTS";
  isActive: boolean;
};

/**
 * Issuing and following a client's identification link.
 *
 * The URL is composed in the browser from the current origin rather than an
 * env var, so it is right in development, on a preview deployment and in
 * production without configuration — and a link that points at the wrong host
 * is a link a client cannot open.
 *
 * Sending is a mailto: rather than a transactional email. Nothing here sends
 * mail yet, and this way the message leaves the agent's own address, which is
 * where a client expects it to come from.
 */
export function IntakeLinkPanel({
  contactId,
  rentalId,
  contactName,
  contactEmail,
  stayLabel,
  links,
  canManage,
  scope = "FULL",
  title = "Informations du client",
  intro = "Un lien personnel pour que le client renseigne lui-même son identité (obligation LCB-FT / TRACFIN). Le formulaire est pré-rempli avec ce que nous avons déjà ; ses réponses mettent à jour sa fiche contact.",
  children,
}: {
  contactId: string;
  rentalId?: string;
  contactName: string;
  contactEmail: string | null;
  stayLabel?: string;
  links: IntakeLinkRow[];
  canManage: boolean;
  scope?: "FULL" | "OCCUPANTS";
  title?: string;
  intro?: string;
  /** What is still outstanding, shown above the link controls. */
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const live = links.find((l) => l.isActive);
  const answered = links.filter((l) => l.submittedAt !== null);

  // Composed at click time: the component may render on the server, where
  // window does not exist.
  const urlFor = (token: string) =>
    typeof window === "undefined"
      ? `/intake/${token}`
      : `${window.location.origin}/intake/${token}`;

  function generate() {
    setBusy(true);
    void createIntakeLink({
      contactId,
      scope,
      ...(rentalId ? { rentalId } : {}),
    })
      .then(async (result) => {
        if (result.status === "error") {
          toast.error(result.message);
          return;
        }
        // Copy immediately: the reason to make a link is to send it.
        try {
          await navigator.clipboard.writeText(urlFor(result.token));
          toast.success("Lien créé et copié.");
        } catch {
          toast.success("Lien créé.");
        }
        router.refresh();
      })
      .finally(() => setBusy(false));
  }

  function copy(token: string) {
    void navigator.clipboard
      .writeText(urlFor(token))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error("Copie impossible."));
  }

  function mail(token: string) {
    const subject = stayLabel
      ? `BSTAY — vos informations pour ${stayLabel}`
      : "BSTAY — vos informations";
    const ask =
      scope === "OCCUPANTS"
        ? "Afin de finaliser votre dossier, merci de nous indiquer les autres occupants du séjour via le lien sécurisé ci-dessous :"
        : "Afin de finaliser votre dossier, merci de vérifier et compléter vos informations via le lien sécurisé ci-dessous :";
    const body = [
      `Bonjour ${contactName},`,
      "",
      ask,
      "",
      urlFor(token),
      "",
      "Ce lien vous est personnel et expire dans 30 jours.",
      "",
      "Bien à vous,",
      "BSTAY",
    ].join("\n");
    window.location.href = `mailto:${contactEmail ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function revoke(id: string) {
    setBusy(true);
    void revokeIntakeLink({ id })
      .then((result) => {
        if (result.status === "error") {
          toast.error(result.message);
          return;
        }
        toast.success("Lien révoqué.");
        router.refresh();
      })
      .finally(() => setBusy(false));
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium">{title}</p>
        {answered.length > 0 ? (
          <Badge variant="secondary" className="font-normal">
            {answered.length} réponse{answered.length > 1 ? "s" : ""}
          </Badge>
        ) : null}
      </div>

      <p className="text-muted-foreground text-xs">{intro}</p>

      {children}

      {live ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link2 aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="text-muted-foreground">
              Lien actif jusqu&apos;au {formatDate(live.expiresAt)}
              {live.submittedAt
                ? ` · répondu le ${formatDate(live.submittedAt)}`
                : " · pas encore rempli"}
            </span>
          </div>

          {canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => copy(live.token)}>
                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                {copied ? "Copié" : "Copier le lien"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => mail(live.token)}>
                <Mail aria-hidden="true" />
                Envoyer par e-mail
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => revoke(live.id)}
              >
                <X aria-hidden="true" />
                Révoquer
              </Button>
            </div>
          ) : null}

          {contactEmail ? null : (
            <p className="text-xs text-amber-600">
              Ce contact n&apos;a pas d&apos;adresse e-mail — l&apos;envoi
              ouvrira un message vide à compléter.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            Aucun lien actif.
            {links.length > 0 ? " Le précédent a expiré ou a été révoqué." : ""}
          </p>
          {canManage ? (
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={generate}>
              <Link2 aria-hidden="true" />
              {busy ? "Création…" : "Générer un lien"}
            </Button>
          ) : null}
        </div>
      )}

      {answered.length > 0 ? (
        <ul className="text-muted-foreground space-y-0.5 border-t pt-2 text-xs">
          {answered.map((l) => (
            <li key={l.id}>
              Répondu le {formatDate(l.submittedAt as Date)} — lien du{" "}
              {formatDate(l.createdAt)}
              {l.authorName ? ` (${l.authorName})` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
