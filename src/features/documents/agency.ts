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
  signatory: "Valentine Claitte",
  signatoryTitle: "Présidente",
} as const;
