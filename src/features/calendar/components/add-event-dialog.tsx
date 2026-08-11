"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import { createCalendarEvent } from "@/features/calendar/actions/create-calendar-event";

export const EVENT_KINDS = [
  ["MAINTENANCE", "Intervention / entretien"],
  ["CLEANING", "Ménage"],
  ["VIEWING", "Visite"],
  ["OWNER_STAY", "Séjour du propriétaire"],
  ["BLOCKED", "Bien indisponible"],
  ["OTHER", "Autre"],
] as const;

/**
 * Adding something the bookings do not already say.
 *
 * Arrivals and departures are deliberately not offered here: they belong to a
 * rental, and an event duplicating one would drift the moment the booking
 * moves. What this is for is the rest — a caretaker's visit, a pool service,
 * an owner staying in their own villa.
 */
export function AddEventDialog({
  properties,
  rentals,
  defaultDate,
}: {
  properties: ComboboxOption[];
  /** Bookings the entry can be attached to; it then takes their colour. */
  rentals: ComboboxOption[];
  /** Opened from a day, the form starts on that day rather than on today. */
  defaultDate?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const initial = defaultDate ?? new Date().toISOString().slice(0, 10);
  const [title, setTitle] = React.useState("");
  const [kind, setKind] = React.useState<string>("MAINTENANCE");
  const [startsOn, setStartsOn] = React.useState(initial);
  const [endsOn, setEndsOn] = React.useState(initial);
  // Optional: most entries are all-day. A viewing at 11h fills them.
  const [startTime, setStartTime] = React.useState("");
  const [endTime, setEndTime] = React.useState("");
  const [propertyId, setPropertyId] = React.useState("");
  const [rentalId, setRentalId] = React.useState("");
  const [notes, setNotes] = React.useState("");

  function submit() {
    startTransition(async () => {
      const result = await createCalendarEvent({
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
      toast.success("Événement ajouté.");
      setTitle("");
      setNotes("");
      setPropertyId("");
      setRentalId("");
      setStartTime("");
      setEndTime("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" size="sm">
            <Plus aria-hidden="true" />
            Ajouter un événement
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvel événement</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="event-title">Intitulé</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Passage du jardinier, état des lieux…"
              disabled={isPending}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event-kind">Type</Label>
              <Select
                value={kind}
                onValueChange={(v) => v !== null && setKind(v)}
                items={EVENT_KINDS.map(([value, label]) => ({ value, label }))}
                disabled={isPending}
              >
                <SelectTrigger id="event-kind" className="w-full">
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
              <Label htmlFor="event-property">Bien (facultatif)</Label>
              <Combobox
                id="event-property"
                value={propertyId || null}
                onValueChange={setPropertyId}
                options={properties}
                placeholder="Aucun bien…"
                emptyLabel="Aucun bien ne correspond."
                // A booking already names its villa; choosing both invites
                // them to disagree.
                disabled={isPending || rentalId !== ""}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="event-rental">Location (facultatif)</Label>
              <Combobox
                id="event-rental"
                value={rentalId || null}
                onValueChange={(v) => {
                  setRentalId(v);
                  // The booking settles the villa; clearing the field avoids
                  // sending a property that contradicts it.
                  if (v) setPropertyId("");
                }}
                options={rentals}
                placeholder="Aucune location…"
                emptyLabel="Aucune location ne correspond."
                disabled={isPending}
              />
              <p className="text-muted-foreground text-xs">
                Rattaché à une location, l&apos;événement prend sa couleur dans
                le calendrier.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-start">Début</Label>
              <Input
                id="event-start"
                type="date"
                value={startsOn}
                onChange={(e) => {
                  setStartsOn(e.target.value);
                  // A range that ends before it begins is refused, and the
                  // usual case is a single day — so the end follows.
                  if (e.target.value > endsOn) setEndsOn(e.target.value);
                }}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-end">Fin (incluse)</Label>
              <Input
                id="event-end"
                type="date"
                value={endsOn}
                min={startsOn}
                onChange={(e) => setEndsOn(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event-from">Heure de début (facultatif)</Label>
              <Input
                id="event-from"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="11h00"
                disabled={isPending}
                className="tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-to">Heure de fin (facultatif)</Label>
              <Input
                id="event-to"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="12h30"
                disabled={isPending}
                className="tabular-nums"
              />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Sans heure, l&apos;événement occupe la journée entière.
          </p>

          <div className="space-y-2">
            <Label htmlFor="event-notes">Notes</Label>
            <Input
              id="event-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="ghost" disabled={isPending}>
                  Annuler
                </Button>
              }
            />
            <Button type="submit" disabled={isPending || title.trim() === ""}>
              {isPending ? "Ajout…" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
