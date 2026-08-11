"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { deleteCalendarEvent } from "@/features/calendar/actions/delete-calendar-event";
import { updateCalendarEvent } from "@/features/calendar/actions/update-calendar-event";
import { EVENT_KINDS } from "@/features/calendar/components/add-event-dialog";
import type { CalendarEntry } from "@/features/calendar/services/calendar-service";

/** yyyy-mm-dd from a stored date, read in UTC as it was written. */
function dateInput(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * An entry on the calendar, and the panel behind it.
 *
 * Clicking opens the entry rather than following a link, even when it is
 * attached to a booking: an agent who put a gardener on Thursday wants to move
 * him, not to read the rental. The booking is one click further, inside.
 *
 * Editing is free here, unlike almost everywhere else in this application — a
 * calendar entry is a note to the office, not a term anyone agreed to. Whoever
 * wrote it may always change it; reaching across to someone else's takes
 * MANAGE_EVENTS.
 */
export function EventBar({
  event,
  className,
  children,
  properties,
  rentals,
}: {
  event: CalendarEntry;
  className?: string;
  children: React.ReactNode;
  properties: ComboboxOption[];
  rentals: ComboboxOption[];
}) {
  // Per entry, not per user: an agent edits what they wrote and reads the
  // rest.
  const canEdit = event.canEdit;
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const [title, setTitle] = React.useState(event.title);
  const [kind, setKind] = React.useState<string>(event.kind);
  const [startsOn, setStartsOn] = React.useState(dateInput(event.startsOn));
  const [endsOn, setEndsOn] = React.useState(dateInput(event.endsOn));
  const [startTime, setStartTime] = React.useState(event.startTime ?? "");
  const [endTime, setEndTime] = React.useState(event.endTime ?? "");
  const [propertyId, setPropertyId] = React.useState(event.propertyId ?? "");
  const [rentalId, setRentalId] = React.useState(event.rentalId ?? "");
  const [notes, setNotes] = React.useState(event.notes ?? "");

  function save() {
    startTransition(async () => {
      const result = await updateCalendarEvent({
        id: event.id,
        title,
        kind,
        startsOn,
        endsOn,
        startTime,
        endTime,
        propertyId,
        rentalId,
        notes,
      });
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success("Événement modifié.");
      setOpen(false);
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteCalendarEvent({ id: event.id });
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success("Événement supprimé.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        title={[event.title, event.property, event.notes]
          .filter(Boolean)
          .join(" — ")}
        onClick={() => setOpen(true)}
        className={`w-full cursor-pointer text-left ${className ?? ""}`}
      >
        {children}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {canEdit ? "Modifier l'événement" : event.title}
            </DialogTitle>
          </DialogHeader>

          {canEdit ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="edit-title">Intitulé</Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isPending}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-kind">Type</Label>
                  <Select
                    value={kind}
                    onValueChange={(v) => v !== null && setKind(v)}
                    items={EVENT_KINDS.map(([value, label]) => ({
                      value,
                      label,
                    }))}
                    disabled={isPending}
                  >
                    <SelectTrigger id="edit-kind" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_KINDS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-property">Bien</Label>
                  <Combobox
                    id="edit-property"
                    value={propertyId || null}
                    onValueChange={setPropertyId}
                    options={properties}
                    placeholder="Aucun bien…"
                    emptyLabel="Aucun bien ne correspond."
                    disabled={isPending || rentalId !== ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-start">Début</Label>
                  <Input
                    id="edit-start"
                    type="date"
                    value={startsOn}
                    onChange={(e) => {
                      setStartsOn(e.target.value);
                      if (e.target.value > endsOn) setEndsOn(e.target.value);
                    }}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-end">Fin (incluse)</Label>
                  <Input
                    id="edit-end"
                    type="date"
                    value={endsOn}
                    min={startsOn}
                    onChange={(e) => setEndsOn(e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-from">Heure de début</Label>
                  <Input
                    id="edit-from"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="11h00"
                    disabled={isPending}
                    className="tabular-nums"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-to">Heure de fin</Label>
                  <Input
                    id="edit-to"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="12h30"
                    disabled={isPending}
                    className="tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-rental">Location</Label>
                <Combobox
                  id="edit-rental"
                  value={rentalId || null}
                  onValueChange={(v) => {
                    setRentalId(v);
                    if (v) setPropertyId("");
                  }}
                  options={rentals}
                  placeholder="Aucune location…"
                  emptyLabel="Aucune location ne correspond."
                  disabled={isPending}
                />
                {event.rentalId ? (
                  <Link
                    href={`/rentals/${event.rentalId}`}
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline underline-offset-2"
                  >
                    <ExternalLink aria-hidden="true" className="size-3" />
                    Ouvrir la location
                  </Link>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Input
                  id="edit-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isPending}
                />
              </div>

              <DialogFooter className="sm:justify-between">
                {/* Removed outright: nothing quotes a calendar entry, so
                    keeping a cancelled visit forever is only clutter. */}
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isPending}
                  onClick={remove}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 aria-hidden="true" />
                  Supprimer
                </Button>
                <div className="flex items-center gap-2">
                  <DialogClose
                    render={
                      <Button type="button" variant="ghost" disabled={isPending}>
                        Annuler
                      </Button>
                    }
                  />
                  <Button type="submit" disabled={isPending || title.trim() === ""}>
                    {isPending ? "Enregistrement…" : "Enregistrer"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                {[event.property, event.notes].filter(Boolean).join(" · ") ||
                  "Aucun détail."}
              </p>
              {event.rentalId ? (
                <Link
                  href={`/rentals/${event.rentalId}`}
                  className="inline-flex items-center gap-1 text-xs underline underline-offset-2"
                >
                  <ExternalLink aria-hidden="true" className="size-3" />
                  Ouvrir la location
                </Link>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
