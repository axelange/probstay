"use client";

import * as React from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteUser } from "@/features/users/actions/invite-user";
import { STAFF_EMAIL_DOMAIN } from "@/features/users/schemas/invitation-schema";
import { roleLabel } from "@/lib/user-display";

export function InviteUserDialog({
  assignableRoles,
  canInviteExternal,
}: {
  /** Only roles beneath the inviter — resolved on the server, so a role
   *  they may not grant is never offered. The action re-checks anyway. */
  assignableRoles: Role[];
  canInviteExternal: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<string>(assignableRoles[0] ?? "");
  const [isExternal, setIsExternal] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  // Nothing to offer: an account that outranks nobody cannot invite.
  if (assignableRoles.length === 0) return null;

  function reset() {
    setEmail("");
    setRole(assignableRoles[0] ?? "");
    setIsExternal(false);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await inviteUser({ email, role, isExternal });

      if (result.status === "error") {
        toast.error(result.message);
        return;
      }

      toast.success(`${result.email} a été invité.`);
      reset();
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <UserPlus aria-hidden="true" />
            Inviter
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Inviter un utilisateur</DialogTitle>
            <DialogDescription>
              L&apos;accès est accordé par invitation. La personne pourra se
              connecter avec Google, et son rôle sera appliqué à sa première
              connexion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Adresse e-mail</Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={`prenom.nom${STAFF_EMAIL_DOMAIN}`}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Rôle</Label>
              <Select
                value={role}
                onValueChange={(next) => next !== null && setRole(next)}
                items={assignableRoles.map((r) => ({
                  value: r,
                  label: roleLabel(r),
                }))}
                disabled={isPending}
              >
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((value) => (
                    <SelectItem key={value} value={value}>
                      {roleLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canInviteExternal ? (
              <div className="flex items-start gap-2">
                <input
                  id="invite-external"
                  type="checkbox"
                  checked={isExternal}
                  onChange={(event) => setIsExternal(event.target.checked)}
                  disabled={isPending}
                  className="mt-0.5 size-4 cursor-pointer"
                />
                <Label
                  htmlFor="invite-external"
                  className="cursor-pointer font-normal"
                >
                  Adresse externe
                  <span className="text-muted-foreground block text-xs">
                    Autorise une adresse hors {STAFF_EMAIL_DOMAIN}, pour un
                    prestataire.
                  </span>
                </Label>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || !email.trim()}>
              {isPending ? "Envoi…" : "Inviter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
