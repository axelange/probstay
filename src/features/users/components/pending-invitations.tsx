"use client";

import * as React from "react";
import { MailX } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PendingInvitation } from "@/features/users/services/user-service";
import { revokeInvitation } from "@/features/users/actions/revoke-invitation";
import { roleLabel } from "@/lib/user-display";

const INVITED_AT = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeZone: "Europe/Paris",
});

export function PendingInvitations({
  invitations,
}: {
  invitations: PendingInvitation[];
}) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  if (invitations.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
        Aucune invitation en attente.
      </p>
    );
  }

  function revoke(invitation: PendingInvitation) {
    setPendingId(invitation.id);

    startTransition(async () => {
      const result = await revokeInvitation(invitation.id);
      setPendingId(null);

      if (result.status === "error") {
        toast.error(result.message);
        return;
      }

      toast.success(`Invitation de ${invitation.email} annulée.`);
    });
  }

  return (
    <ul className="divide-y rounded-lg border">
      {invitations.map((invitation) => (
        <li
          key={invitation.id}
          className="flex items-center gap-3 px-4 py-3 text-sm"
        >
          <div className="min-w-0 flex-1">
            <span className="block truncate font-medium">
              {invitation.email}
            </span>
            <span className="text-muted-foreground block truncate text-xs">
              Invité le {INVITED_AT.format(invitation.createdAt)}
              {invitation.inviter ? ` par ${invitation.inviter.fullName}` : ""}
            </span>
          </div>

          {invitation.isExternal ? (
            <Badge variant="outline" className="shrink-0 font-normal">
              Externe
            </Badge>
          ) : null}

          <Badge variant="secondary" className="shrink-0 font-normal">
            {roleLabel(invitation.role)}
          </Badge>

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Annuler l'invitation de ${invitation.email}`}
            title="Annuler l'invitation"
            className="shrink-0 cursor-pointer"
            disabled={pendingId === invitation.id}
            onClick={() => revoke(invitation)}
          >
            <MailX aria-hidden="true" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
