"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ContactRentalRow } from "@/features/contacts/services/contact-documents";
import {
  bookingStatusLabel,
  formatStay,
} from "@/features/rentals/components/rental-labels";

/** How many fit on the fiche before the list starts to bury what follows. */
const INLINE = 10;
/** Rows per page inside the dialog. */
const PER_PAGE = 10;

function RentalLink({ rental }: { rental: ContactRentalRow }) {
  return (
    <Link
      href={`/rentals/${rental.id}`}
      className="hover:bg-accent flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors"
    >
      <span className="min-w-0">
        <span className="block truncate font-medium">{rental.property}</span>
        <span className="text-muted-foreground block text-xs">
          {formatStay(rental.checkIn, rental.checkOut)} ·{" "}
          {rental.role === "owner" ? "propriétaire" : "locataire"}
        </span>
      </span>
      <span className="text-muted-foreground shrink-0 text-xs">
        {bookingStatusLabel(rental.bookingStatus)}
      </span>
    </Link>
  );
}

/**
 * A contact's bookings, most recent first.
 *
 * The ten latest sit on the fiche; the rest open in a dialog rather than
 * extending the column, because a long-standing owner's history would
 * otherwise push everything below it off the screen — and someone opening a
 * fiche is usually after the recent ones.
 *
 * Paged in the browser: the whole list is already loaded, and a contact with
 * enough bookings to make server paging worthwhile does not exist here.
 */
export function ContactRentals({ rentals }: { rentals: ContactRentalRow[] }) {
  const [page, setPage] = React.useState(0);

  if (rentals.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-sm">
        Aucune location pour ce contact.
      </p>
    );
  }

  const pages = Math.ceil(rentals.length / PER_PAGE);
  const shown = rentals.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <div className="space-y-2">
      <ul className="divide-y rounded-lg border">
        {rentals.slice(0, INLINE).map((rental) => (
          <li key={rental.id}>
            <RentalLink rental={rental} />
          </li>
        ))}
      </ul>

      {rentals.length > INLINE ? (
        <Dialog>
          <DialogTrigger
            render={
              <Button type="button" variant="outline" size="sm">
                {rentals.length - INLINE === 1
                  ? "Afficher la dernière"
                  : `Afficher les ${rentals.length - INLINE} autres`}
              </Button>
            }
          />
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Locations{" "}
                <span className="text-muted-foreground tabular-nums">
                  ({rentals.length})
                </span>
              </DialogTitle>
            </DialogHeader>

            <ul className="divide-y rounded-lg border">
              {shown.map((rental) => (
                <li key={rental.id}>
                  <RentalLink rental={rental} />
                </li>
              ))}
            </ul>

            {pages > 1 ? (
              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft aria-hidden="true" />
                  Précédent
                </Button>
                <span className="text-muted-foreground text-xs tabular-nums">
                  Page {page + 1} sur {pages}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={page >= pages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Suivant
                  <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
