/**
 * Fixed agency identity shown on every document — the real BSTAY details,
 * from the house "Rental Confirmation" template. A placeholder location for
 * now (it will move to an editable settings record), but the values are real.
 */
export const AGENCY = {
  name: "B·STAY",
  tagline: "Locations d'exception",
  legalName: "SAS BSTAY",
  legalForm: "SAS",
  // Not shown on the house template's footer — left blank until confirmed.
  capital: "",
  address: "18 Avenue Général Leclerc, 83990 Saint-Tropez",
  rcs: "RCS Fréjus 920 635 356",
  cartePro: "Carte professionnelle n° 83042026000000007",
  garantieFinanciere: "Garantie financière CEGC n°31961GES261",
  rcp: "RCP Generali n° AL591311/31961",
  web: "www.b-stay.com",
  phone: "+33 6 85 87 78 68",
  representedBy: "Valentine Claitte",
  capacity: "Présidente",
  // Standard arrival and departure times, printed in the agreement's rental
  // terms. Agency-wide rather than per-rental: a negotiated late departure is
  // recorded nowhere yet, so it would print the standard time regardless.
  // Bank details for incoming transfers, printed in the agreement's payment
  // section. Agency-wide and rarely changed — but see the security notice
  // beside them: a change communicated by email is exactly the fraud they warn
  // against, so these are edited here deliberately, never from a message.
  bankName: "CIC",
  bankAccountName: "BSTAY",
  bankIban: "FR76 1009 6180 8000 0464 4770 580",
  bankBic: "CMCIFRPP",
  checkInTime: "16h00",
  checkOutTime: "10h00",
  signatory: "Valentine Claitte",
  signatoryTitle: "Présidente",
} as const;
