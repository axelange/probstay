import type { ContratData } from "@/features/documents/templates/contrat-location-saisonniere";

/** Fictional data for the sample document — not a real record. */
export const sampleContrat: ContratData = {
  reference: "BS-2026-0148",
  place: "Cannes",
  date: "23 juillet 2026",
  agency: {
    name: "B-STAY",
    tagline: "Locations d'exception · Côte d'Azur",
    legalForm: "SAS",
    capital: "50 000 €",
    rcs: "RCS Cannes 900 000 000",
    address: "12 boulevard de la Croisette, 06400 Cannes",
    representedBy: "Mme Valentine Roche",
    capacity: "Présidente",
  },
  owner: {
    name: "M. Thomas Buffa",
    detail: "Propriétaire du bien ci-après désigné.",
  },
  tenant: {
    kind: "COMPANY",
    name: "ALANIAN STAR",
    legalForm: "Société Civile Particulière",
    registrationNumber: "25SC26315",
    registeredOffice:
      "c/o Gordon S. Blair, 7 rue du Gabian, Le Gildo Pastor Center, 98000 Monaco",
    representative: "M. Aslan Khabliev",
    capacity: "Gérant",
  },
  property: {
    name: "Villa Reina",
    address: "42 boulevard de la Croisette",
    city: "Cannes (06400)",
    kind: "villa contemporaine avec piscine",
    surface: "320 m²",
    rooms: "8 pièces dont 5 chambres",
    sleeps: "jusqu'à 10 personnes",
  },
  stay: {
    checkIn: "13 août 2026",
    checkOut: "25 août 2026",
    nights: "12 nuits",
    guests: "10 personnes",
  },
  money: {
    rent: "48 000,00 €",
    services: [
      { label: "Conciergerie privée", amount: "2 400,00 €" },
      { label: "Chef à domicile (3 services)", amount: "1 800,00 €" },
    ],
    touristTax: "330,00 €",
    total: "52 530,00 €",
    securityDeposit: "10 000,00 €",
    deposit: "24 000,00 €",
  },
};
