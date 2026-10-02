/**
 * How a contact is named and addressed on an invoice.
 *
 * Client-safe on purpose: the server snapshots these two strings when a draft
 * is saved, and the live preview has to show the very same thing while the
 * agent is still typing. One function, read from both sides, rather than a
 * server rule and a preview that approximates it.
 */

export type BillingContact = {
  kind: "INDIVIDUAL" | "COMPANY";
  firstName: string | null;
  lastName: string;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  company: { legalForm: string | null; registeredOffice: string | null } | null;
};

/**
 * A company is billed under its denomination alone — `lastName` holds it, as
 * everywhere else in this codebase — with its legal form beside it when known.
 * A person is billed under their full name.
 */
export function billingName(contact: BillingContact): string {
  if (contact.kind === "COMPANY") {
    const form = contact.company?.legalForm;
    return form ? `${contact.lastName} (${form})` : contact.lastName;
  }
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ");
}

/**
 * A company's registered office, a person's postal address. Null when nothing
 * is on file — better a blank the agent can see than an invented line.
 */
export function billingAddress(contact: BillingContact): string | null {
  if (contact.kind === "COMPANY" && contact.company?.registeredOffice) {
    return contact.company.registeredOffice;
  }
  const parts = [
    contact.address,
    [contact.postalCode, contact.city].filter(Boolean).join(" "),
    contact.country,
  ].filter((part) => part && part.trim() !== "");
  return parts.length > 0 ? parts.join(", ") : null;
}
